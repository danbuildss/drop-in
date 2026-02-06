// ─────────────────────────────────────────────────────────────
//  POST /api/events
//  Body: { chainEventId, title, description?, organizer, maxAttendees? }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainEventId, title, description, organizer, maxAttendees } = body;

    if (!chainEventId || !title || !organizer) {
      return NextResponse.json(
        { error: "chainEventId, title, and organizer are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({
        chain_event_id: chainEventId,
        title,
        description: description ?? null,
        organizer,
        max_attendees: maxAttendees ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Event with this chain ID already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainEventId = searchParams.get("chainEventId");
  const organizer = searchParams.get("organizer");

  if (chainEventId) {
    const { data, error } = await supabaseAdmin
      .from("v_event_summary")
      .select("*")
      .eq("chain_event_id", Number(chainEventId))
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  if (organizer) {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .ilike("organizer", organizer)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json(
    { error: "Provide chainEventId or organizer query param" },
    { status: 400 }
  );
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainEventId = searchParams.get("chainEventId");
  const organizer = searchParams.get("organizer");

  if (!chainEventId || !organizer) {
    return NextResponse.json(
      { error: "chainEventId and organizer are required" },
      { status: 400 }
    );
  }

  // Verify the event belongs to this organizer before deleting
  const { data: event, error: fetchError } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("chain_event_id", Number(chainEventId))
    .single();

  if (fetchError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.organizer.toLowerCase() !== organizer.toLowerCase()) {
    return NextResponse.json(
      { error: "Not authorized to delete this event" },
      { status: 403 }
    );
  }

  // Delete associated check-ins first
  await supabaseAdmin
    .from("checkins")
    .delete()
    .eq("event_id", event.id);

  // Delete associated giveaways
  await supabaseAdmin
    .from("giveaways")
    .delete()
    .eq("event_id", event.id);

  // Delete the event
  const { error: deleteError } = await supabaseAdmin
    .from("events")
    .delete()
    .eq("id", event.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: chainEventId });
}
