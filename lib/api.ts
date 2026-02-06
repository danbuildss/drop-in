// ─────────────────────────────────────────────────────────────
//  lib/api.ts — Frontend client for the Next.js API routes
//
//  All Supabase operations go through /api/* routes which
//  use the service role key server-side. The frontend never
//  touches Supabase directly.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface ApiEvent {
  id: string;
  chain_event_id: number;
  title: string;
  description: string | null;
  organizer: string;
  max_attendees: number | null;
  is_locked: boolean;
  created_at: string;
}

export interface ApiEventSummary extends ApiEvent {
  attendee_count: number;
  giveaway_executed: boolean;
  winner_count: number | null;
  winners: string[] | null;
  tx_hash: string | null;
}

export interface ApiCheckIn {
  id: string;
  event_id: string;
  wallet_address: string;
  checked_in_at: string;
}

export interface ApiGiveaway {
  id: string;
  event_id: string;
  winner_count: number;
  winners: string[];
  tx_hash: string | null;
  executed_at: string | null;
  created_at: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body.error || "Request failed", res.status);
  }
  return body as T;
}

// ── Events ───────────────────────────────────────────────────

export async function apiCreateEvent(input: {
  chainEventId: number;
  title: string;
  description?: string;
  organizer: string;
  maxAttendees?: number;
}): Promise<ApiEvent> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ApiEvent>(res);
}

export async function apiGetEventSummary(
  chainEventId: number
): Promise<ApiEventSummary> {
  const res = await fetch(`/api/events?chainEventId=${chainEventId}`);
  return handleResponse<ApiEventSummary>(res);
}

export async function apiGetEventsByOrganizer(
  wallet: string
): Promise<ApiEvent[]> {
  const res = await fetch(
    `/api/events?organizer=${encodeURIComponent(wallet)}`
  );
  return handleResponse<ApiEvent[]>(res);
}

export async function apiDeleteEvent(
  chainEventId: number,
  organizer: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `/api/events?chainEventId=${chainEventId}&organizer=${encodeURIComponent(organizer)}`,
    { method: "DELETE" }
  );
  return handleResponse<{ success: boolean }>(res);
}

// ── Check-ins ────────────────────────────────────────────────

export async function apiCheckIn(input: {
  eventId: string;
  walletAddress: string;
}): Promise<ApiCheckIn> {
  const res = await fetch("/api/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ApiCheckIn>(res);
}

export async function apiGetAttendees(
  eventId: string
): Promise<ApiCheckIn[]> {
  const res = await fetch(`/api/checkins?eventId=${eventId}`);
  return handleResponse<ApiCheckIn[]>(res);
}

export async function apiGetWalletCheckInCount(
  wallet: string
): Promise<{ wallet: string; count: number }> {
  const res = await fetch(`/api/checkins?wallet=${encodeURIComponent(wallet)}`);
  return handleResponse<{ wallet: string; count: number }>(res);
}

// ── Giveaways ────────────────────────────────────────────────

export async function apiCreateGiveaway(input: {
  eventId: string;
  winnerCount: number;
}): Promise<ApiGiveaway> {
  const res = await fetch("/api/giveaways", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ApiGiveaway>(res);
}

export async function apiFinalizeGiveaway(input: {
  giveawayId: string;
  winners: string[];
  txHash: string;
}): Promise<ApiGiveaway> {
  const res = await fetch("/api/giveaways", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ApiGiveaway>(res);
}

export async function apiGetGiveaway(
  eventId: string
): Promise<ApiGiveaway | null> {
  const res = await fetch(`/api/giveaways?eventId=${eventId}`);
  return handleResponse<ApiGiveaway | null>(res);
}
