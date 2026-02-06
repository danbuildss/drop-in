// ─────────────────────────────────────────────────────────────
//  lib/share.ts — Social Sharing Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Share content on Farcaster via Warpcast compose
 */
export function shareOnFarcaster(text: string, url?: string) {
  const encoded = encodeURIComponent(text + (url ? ` ${url}` : ''));
  window.open(`https://warpcast.com/~/compose?text=${encoded}`, '_blank');
}

/**
 * Share content on X (Twitter) via intent
 */
export function shareOnX(text: string, url?: string) {
  const params = new URLSearchParams({ text, url: url || '' });
  window.open(`https://twitter.com/intent/tweet?${params}`, '_blank');
}

/**
 * Generate check-in share text
 */
export function getCheckInShareText(eventName: string): string {
  return `Just checked in at ${eventName} using @DropIn_xyz — Onchain Event Check-In. Scan. Register. Win. 🎰`;
}

/**
 * Generate winners share text
 */
export function getWinnersShareText(eventName: string): string {
  return `🏆 Winners just dropped for ${eventName} using @DropIn_xyz — Onchain Event Check-In. Scan. Register. Win.`;
}
