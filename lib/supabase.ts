// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
//  lib/supabase.ts — DropIn MVP database operations
//
//  All functions use the Supabase client with the user's JWT
//  (which contains wallet_address in its claims). RLS handles
//  authorization — no manual permission checks needed here.
// ═══════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types"; // generated with `supabase gen types`

// ─────────────────────────────────────────────────────────────
//  Client singleton
// ─────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

export interface CreateEventInput {
  chainEventId: number;
  title: string;
  description?: string;
  organizer: string; // wallet address
  maxAttendees?: number;
}

export interface CheckInInput {
  eventId: string; // uuid
  walletAddress: string;
}

export interface CreateGiveawayInput {
  eventId: string;
  winnerCount: number;
}

export interface FinalizeGiveawayInput {
  giveawayId: string;
  winners: string[]; // wallet addresses from on-chain event
  txHash: string;
}

export interface EventSummary {
  id: string;
  chain_event_id: number;
  title: string;
  organizer: string;
  is_locked: boolean;
  created_at: string;
  attendee_count: number;
  giveaway_executed: boolean;
  winner_count: number | null;
  winners: string[] | null;
  tx_hash: string | null;
}

// Custom error for cleaner handling in the UI
export class DropInError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "DropInError";
  }
}

// ═══════════════════════════════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new off-chain event.
 * The organizer field must match the JWT's wallet_address claim (RLS enforced).
 *
 * @example
 * const event = await createEvent({
 *   chainEventId: 42,
 *   title: "ETH Denver 2026 Meetup",
 *   organizer: "0xAA49d591b259324671792C8f972486403895Ff9b",
 *   maxAttendees: 200,
 * });
 */
export async function createEvent(input: CreateEventInput) {
  const { data, error } = await supabase
    .from("events")
    .insert({
      chain_event_id: input.chainEventId,
      title: input.title,
      description: input.description ?? null,
      organizer: input.organizer,
      max_attendees: input.maxAttendees ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new DropInError(
        `Event with chain ID ${input.chainEventId} already exists`,
        "DUPLICATE_EVENT"
      );
    }
    throw new DropInError(error.message, error.code);
  }

  return data;
}

/**
 * Fetch a single event by its Supabase UUID.
 */
export async function getEventById(eventId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) throw new DropInError(error.message, error.code);
  return data;
}

/**
 * Fetch a single event by its on-chain event ID.
 */
export async function getEventByChainId(chainEventId: number) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("chain_event_id", chainEventId)
    .single();

  if (error) throw new DropInError(error.message, error.code);
  return data;
}

/**
 * List all events created by a specific organizer wallet.
 */
export async function getEventsByOrganizer(wallet: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .ilike("organizer", wallet) // citext but ilike for extra safety
    .order("created_at", { ascending: false });

  if (error) throw new DropInError(error.message, error.code);
  return data;
}

/**
 * Rich event summary using the v_event_summary view.
 */
export async function getEventSummary(
  chainEventId: number
): Promise<EventSummary> {
  const { data, error } = await supabase
    .from("v_event_summary")
    .select("*")
    .eq("chain_event_id", chainEventId)
    .single();

  if (error) throw new DropInError(error.message, error.code);
  return data as EventSummary;
}


// ═══════════════════════════════════════════════════════════════
//  CHECK-INS  (gasless)
// ═══════════════════════════════════════════════════════════════

/**
 * Gasless attendee check-in.
 * - RLS ensures wallet_address matches the JWT claim.
 * - DB unique constraint prevents double check-ins.
 * - Trigger rejects inserts if the event is locked.
 *
 * @example
 * try {
 *   const checkIn = await checkInAttendee({
 *     eventId: "a1b2c3d4-...",
 *     walletAddress: "0x1234...abcd",
 *   });
 *   console.log("Checked in at:", checkIn.checked_in_at);
 * } catch (e) {
 *   if (e instanceof DropInError && e.code === "ALREADY_CHECKED_IN") {
 *     // show "you're already registered" in the UI
 *   }
 * }
 */
export async function checkInAttendee(input: CheckInInput) {
  // Pre-flight: check capacity (optional, avoids a wasted round-trip)
  const { data: event } = await supabase
    .from("events")
    .select("id, max_attendees, is_locked")
    .eq("id", input.eventId)
    .single();

  if (!event) {
    throw new DropInError("Event not found", "NOT_FOUND");
  }
  if (event.is_locked) {
    throw new DropInError(
      "Event is locked — giveaway already executed",
      "EVENT_LOCKED"
    );
  }
  if (event.max_attendees !== null) {
    const { count } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("event_id", input.eventId);

    if (count !== null && count >= event.max_attendees) {
      throw new DropInError("Event is at full capacity", "CAPACITY_REACHED");
    }
  }

  // Insert check-in
  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      event_id: input.eventId,
      wallet_address: input.walletAddress,
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation → duplicate check-in
    if (error.code === "23505") {
      throw new DropInError(
        "Wallet already checked into this event",
        "ALREADY_CHECKED_IN"
      );
    }
    // Trigger rejection → event locked
    if (error.code === "P0001") {
      throw new DropInError(
        "Event is locked — giveaway already executed",
        "EVENT_LOCKED"
      );
    }
    throw new DropInError(error.message, error.code);
  }

  return data;
}

/**
 * Get all attendees for an event (organizer or self).
 * RLS scopes results automatically.
 */
export async function getAttendees(eventId: string) {
  const { data, error } = await supabase
    .from("check_ins")
    .select("id, wallet_address, checked_in_at")
    .eq("event_id", eventId)
    .order("checked_in_at", { ascending: true });

  if (error) throw new DropInError(error.message, error.code);
  return data;
}

/**
 * Check if a specific wallet has already checked in to an event.
 */
export async function isCheckedIn(
  eventId: string,
  wallet: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("check_ins")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .ilike("wallet_address", wallet);

  if (error) throw new DropInError(error.message, error.code);
  return (count ?? 0) > 0;
}


// ═══════════════════════════════════════════════════════════════
//  GIVEAWAYS
// ═══════════════════════════════════════════════════════════════

/**
 * Step 1: Create a pending giveaway record.
 * Called BEFORE the on-chain runGiveaway transaction.
 * The trigger auto-locks the event.
 *
 * @example
 * const giveaway = await createGiveaway({
 *   eventId: "a1b2c3d4-...",
 *   winnerCount: 5,
 * });
 * // Now submit the on-chain tx, then call finalizeGiveaway().
 */
export async function createGiveaway(input: CreateGiveawayInput) {
  const { data, error } = await supabase
    .from("giveaways")
    .insert({
      event_id: input.eventId,
      winner_count: input.winnerCount,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new DropInError(
        "Giveaway already exists for this event",
        "DUPLICATE_GIVEAWAY"
      );
    }
    throw new DropInError(error.message, error.code);
  }

  return data;
}

/**
 * Step 2: Finalize the giveaway after on-chain confirmation.
 * Writes the winner addresses (from the GiveawayWinners event log)
 * and the transaction hash.
 *
 * @example
 * await finalizeGiveaway({
 *   giveawayId: giveaway.id,
 *   winners: ["0xabc...", "0xdef..."],
 *   txHash: "0x9f8e7d...",
 * });
 */
export async function finalizeGiveaway(input: FinalizeGiveawayInput) {
  const { data, error } = await supabase
    .from("giveaways")
    .update({
      winners: input.winners,
      tx_hash: input.txHash,
      executed_at: new Date().toISOString(),
    })
    .eq("id", input.giveawayId)
    .select()
    .single();

  if (error) throw new DropInError(error.message, error.code);
  return data;
}

/**
 * Fetch giveaway results for an event.
 */
export async function getGiveaway(eventId: string) {
  const { data, error } = await supabase
    .from("giveaways")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle(); // null if no giveaway yet

  if (error) throw new DropInError(error.message, error.code);
  return data;
}


// ═══════════════════════════════════════════════════════════════
//  FULL WORKFLOW EXAMPLE
//  Demonstrates the complete flow from event creation to
//  giveaway finalization. Import and call from a page or API route.
// ═══════════════════════════════════════════════════════════════

/**
 * End-to-end example (for reference / testing).
 *
 * In production, each step maps to a user action:
 *   1. Organizer creates event         → createEvent()
 *   2. Attendees scan QR & check in    → checkInAttendee()
 *   3. Organizer views attendee list   → getAttendees()
 *   4. Organizer triggers draw         → createGiveaway() + on-chain tx
 *   5. Backend confirms on-chain       → finalizeGiveaway()
 *   6. Anyone views results            → getGiveaway() or getEventSummary()
 */
export async function exampleFullWorkflow() {
  const organizer = "0xAA49d591b259324671792C8f972486403895Ff9b";

  // ── 1. Create event ───────────────────────────────────────
  const event = await createEvent({
    chainEventId: 101,
    title: "Base Builders Night",
    description: "Monthly meetup for Base builders",
    organizer,
    maxAttendees: 50,
  });
  console.log("Event created:", event.id);

  // ── 2. Attendees check in (gasless — no on-chain tx) ──────
  const wallets = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
  ];

  for (const wallet of wallets) {
    const checkIn = await checkInAttendee({
      eventId: event.id,
      walletAddress: wallet,
    });
    console.log(`${wallet} checked in at ${checkIn.checked_in_at}`);
  }

  // Duplicate check-in should fail gracefully
  try {
    await checkInAttendee({
      eventId: event.id,
      walletAddress: wallets[0],
    });
  } catch (e) {
    if (e instanceof DropInError) {
      console.log("Expected error:", e.code); // ALREADY_CHECKED_IN
    }
  }

  // ── 3. Organizer views attendees ──────────────────────────
  const attendees = await getAttendees(event.id);
  console.log(`${attendees.length} attendees registered`);

  // ── 4. Create giveaway (locks event) ──────────────────────
  const giveaway = await createGiveaway({
    eventId: event.id,
    winnerCount: 2,
  });
  console.log("Giveaway created:", giveaway.id);

  // Check-in should now fail (event locked)
  try {
    await checkInAttendee({
      eventId: event.id,
      walletAddress: "0x4444444444444444444444444444444444444444",
    });
  } catch (e) {
    if (e instanceof DropInError) {
      console.log("Expected error:", e.code); // EVENT_LOCKED
    }
  }

  // ── 5. After on-chain confirmation, finalize ──────────────
  const finalized = await finalizeGiveaway({
    giveawayId: giveaway.id,
    winners: [wallets[0], wallets[2]],
    txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  });
  console.log("Winners:", finalized.winners);

  // ── 6. Anyone can view the summary ────────────────────────
  const summary = await getEventSummary(101);
  console.log("Event summary:", {
    title: summary.title,
    attendees: summary.attendee_count,
    winners: summary.winners,
    tx: summary.tx_hash,
  });
}
