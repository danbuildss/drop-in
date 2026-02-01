// ─────────────────────────────────────────────────────────────
//  POST /api/checkins — Gasless attendee check-in
//  Body: { eventId (uuid), walletAddress }
//
//  GET /api/checkins?eventId=xxx — List attendees for an event
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
    const { eventId, walletAddress } = body;

    if (!eventId || !walletAddress) {
      return NextResponse.json(
        { error: "eventId and walletAddress are required" },
        { status: 400 }
      );
    }

    // Check if event exists and is not locked
    const { data: event } = await supabase
      .from("events")
      .select("id, is_locked, max_attendees")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if ((event as any).is_locked) {
      return NextResponse.json(
        { error: "Event is locked — giveaway already executed" },
        { status: 403 }
      );
    }

    // Check capacity
    if ((event as any).max_attendees !== null) {
      const { count } = await supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (count !== null && count >= (event as any).max_attendees) {
        return NextResponse.json(
          { error: "Event is at full capacity" },
          { status: 403 }
        );
      }
    }

    // Insert check-in
    const { data, error } = await supabase
      .from("check_ins")
      .insert({
        event_id: eventId,
        wallet_address: walletAddress,
      } as any)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already checked in to this event" },
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
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query param required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("check_ins")
    .select("id, event_id, wallet_address, checked_in_at")
    .eq("event_id", eventId)
    .order("checked_in_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}