// ─────────────────────────────────────────────────────────────
//  GET /api/qr-token?eventId=xxx — Generate rotating QR token
//
//  Returns a time-limited token for QR code generation.
//  Token rotates every 30 seconds to prevent screenshot fraud.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { generateQRToken, getSecondsUntilRotation, QR_BUCKET_SIZE_SECONDS } from "@/lib/qr-token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query param required" },
      { status: 400 }
    );
  }

  const { token, expiresAt } = generateQRToken(eventId);
  const secondsRemaining = getSecondsUntilRotation();

  return NextResponse.json({
    token,
    expiresAt,
    secondsRemaining,
    bucketSize: QR_BUCKET_SIZE_SECONDS,
  });
}
