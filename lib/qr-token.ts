// ─────────────────────────────────────────────────────────────
//  lib/qr-token.ts — Rotating QR Token Generation & Validation
//
//  Generates HMAC-based tokens that rotate every 30 seconds.
//  Used to prevent QR code screenshots from being reused.
// ─────────────────────────────────────────────────────────────

import { createHmac } from "crypto";

// Time bucket size in seconds (30 sec rotation)
const BUCKET_SIZE_SECONDS = 30;

// Token length (12 chars = 72 bits, secure enough for short-lived tokens)
const TOKEN_LENGTH = 12;

// Get secret from env or fallback for dev
function getSecret(): string {
  return process.env.QR_SECRET || "dev-dropin-qr-secret-change-in-prod";
}

/**
 * Get the current time bucket (30-second interval)
 */
function getTimeBucket(offsetBuckets = 0): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / BUCKET_SIZE_SECONDS) + offsetBuckets;
}

/**
 * Generate HMAC token for a given event and time bucket
 */
function generateHmac(eventId: string, bucket: number): string {
  const secret = getSecret();
  const data = `${eventId}:${bucket}`;
  
  const hmac = createHmac("sha256", secret);
  hmac.update(data);
  
  // Take first TOKEN_LENGTH characters of base64 (URL-safe)
  return hmac.digest("base64url").slice(0, TOKEN_LENGTH);
}

/**
 * Generate a rotating QR token for an event
 * Returns token and expiration timestamp
 */
export function generateQRToken(eventId: string): { token: string; expiresAt: number } {
  const bucket = getTimeBucket();
  const token = generateHmac(eventId, bucket);
  
  // Calculate expiration (end of current bucket)
  const expiresAt = (bucket + 1) * BUCKET_SIZE_SECONDS * 1000;
  
  return { token, expiresAt };
}

/**
 * Validate a QR token for an event
 * Accepts current bucket OR previous bucket (handles scanning at bucket boundary)
 */
export function validateQRToken(eventId: string, token: string): boolean {
  if (!token || token.length !== TOKEN_LENGTH) {
    return false;
  }
  
  // Check current bucket
  const currentBucket = getTimeBucket();
  const currentToken = generateHmac(eventId, currentBucket);
  if (token === currentToken) {
    return true;
  }
  
  // Check previous bucket (handles edge case of scanning right as bucket changes)
  const prevToken = generateHmac(eventId, currentBucket - 1);
  if (token === prevToken) {
    return true;
  }
  
  return false;
}

/**
 * Get seconds remaining until next token rotation
 */
export function getSecondsUntilRotation(): number {
  const now = Math.floor(Date.now() / 1000);
  const secondsInBucket = now % BUCKET_SIZE_SECONDS;
  return BUCKET_SIZE_SECONDS - secondsInBucket;
}

/**
 * Client-side token generator (for use in browser)
 * Uses Web Crypto API instead of Node crypto
 */
export async function generateQRTokenClient(eventId: string): Promise<{ token: string; expiresAt: number }> {
  // This function is for client-side use only
  // It uses a simple hash since we can't use the server secret
  // The actual validation happens server-side
  
  const bucket = getTimeBucket();
  const data = `${eventId}:${bucket}`;
  
  // Use Web Crypto API
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  
  // Convert to base64url
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  
  const token = hashBase64.slice(0, TOKEN_LENGTH);
  const expiresAt = (bucket + 1) * BUCKET_SIZE_SECONDS * 1000;
  
  return { token, expiresAt };
}

// Export bucket size for client countdown
export const QR_BUCKET_SIZE_SECONDS = BUCKET_SIZE_SECONDS;
