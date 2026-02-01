// ─────────────────────────────────────────────────────────────
//  POST /api/giveaways — Create a pending giveaway (locks event)
//  Body: { eventId (uuid), winnerCount }
//
//  PATCH /api/giveaways — Finalize with winners + tx hash
//  Body: { giveawayId, winners[], txHash }
//
//  GET /api/giveaways?eventId=xxx — Get giveaway result
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
    const { eventId, winnerCount } = body;

    if (!eventId || !winnerCount) {
      return NextResponse.json(
        { error: "eventId and winnerCount are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("giveaways")
      .insert({
        event_id: eventId,
        winner_count: winnerCount,
      } as any)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Giveaway already exists for this event" },
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { giveawayId, winners, txHash } = body;

    if (!giveawayId || !winners || !txHash) {
      return NextResponse.json(
        { error: "giveawayId, winners, and txHash are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("giveaways")
      .update({
        winners,
        tx_hash: txHash,
        executed_at: new Date().toISOString(),
      } as any)
      .eq("id", giveawayId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
    .from("giveaways")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}