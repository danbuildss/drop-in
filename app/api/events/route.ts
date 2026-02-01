// ─────────────────────────────────────────────────────────────
//  POST /api/events
//  Body: { chainEventId, title, description?, organizer, maxAttendees? }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { data, error } = await supabase
      .from("events")
      .insert({
        chain_event_id: chainEventId,
        title,
        description: description ?? null,
        organizer,
        max_attendees: maxAttendees ?? null,
      } as any)
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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