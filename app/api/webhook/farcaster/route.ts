// ─────────────────────────────────────────────────────────────
//  app/api/webhook/farcaster/route.ts
//
//  Farcaster webhook endpoint stub
//  Receives notifications from Farcaster for events like:
//  - App installs/uninstalls
//  - User interactions
//  - Notification delivery status
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Log the payload for debugging
    console.log("[Farcaster Webhook] Received payload:", JSON.stringify(payload, null, 2));
    
    // TODO: Handle different webhook event types
    // - app.install
    // - app.uninstall
    // - notification.sent
    // - notification.clicked
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Farcaster Webhook] Error processing webhook:", error);
    return NextResponse.json({ success: true }, { status: 200 }); // Always return 200 to acknowledge receipt
  }
}

// Also handle GET for webhook verification if needed
export async function GET() {
  return NextResponse.json({ status: "ok", service: "farcaster-webhook" });
}
