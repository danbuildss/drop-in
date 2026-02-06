// ─────────────────────────────────────────────────────────────
//  POST /api/checkins — Gasless attendee check-in
//  Body: { eventId (uuid), walletAddress }
//
//  GET /api/checkins?eventId=xxx — List attendees for an event
//  GET /api/checkins?wallet=0x... — Get check-in count for a wallet
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

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
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, is_locked, max_attendees")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.is_locked) {
      return NextResponse.json(
        { error: "Event is locked — giveaway already executed" },
        { status: 403 }
      );
    }

    // Check capacity
    if (event.max_attendees !== null) {
      const { count } = await supabaseAdmin
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (count !== null && count >= event.max_attendees) {
        return NextResponse.json(
          { error: "Event is at full capacity" },
          { status: 403 }
        );
      }
    }

    // Insert check-in
    const { data, error } = await supabaseAdmin
      .from("check_ins")
      .insert({
        event_id: eventId,
        wallet_address: walletAddress,
      })
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
  const wallet = searchParams.get("wallet");

  // If wallet is provided, return count of check-ins for that wallet
  if (wallet) {
    const { count, error } = await supabaseAdmin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("wallet_address", wallet.toLowerCase());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wallet, count: count ?? 0 });
  }

  // Otherwise, return attendees for an event
  if (!eventId) {
    return NextResponse.json(
      { error: "eventId or wallet query param required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("check_ins")
    .select("id, event_id, wallet_address, checked_in_at")
    .eq("event_id", eventId)
    .order("checked_in_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
