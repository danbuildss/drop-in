// ─────────────────────────────────────────────────────────────
//  app/event/[eventId]/results/page.tsx — Public Event Results
//
//  PUBLIC page (no auth required) showing event stats and winners
//  for social proof and shareability.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Trophy,
  Clock,
  CheckCircle,
  Share2,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { apiGetEventSummary, type ApiEventSummary } from "@/lib/api";
import { shareOnFarcaster, shareOnX, getWinnersShareText, getCheckInShareText } from "@/lib/share";
import type { CSSProperties } from "react";

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#000000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "150%",
    height: "150%",
    background: "radial-gradient(circle at center, rgba(0, 82, 255, 0.15), transparent 60%)",
    pointerEvents: "none",
  },
  container: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "500px",
    width: "100%",
  },
  backLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginBottom: "24px",
    textDecoration: "none",
    alignSelf: "flex-start",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  logoImg: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
  },
  logoText: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#FFFFFF",
  },
  card: {
    width: "100%",
    background: "rgba(10, 10, 10, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "20px",
    padding: "32px 24px",
    backdropFilter: "blur(10px)",
    textAlign: "center" as const,
  },
  title: {
    fontSize: "clamp(22px, 5vw, 28px)",
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: "8px",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: "14px",
    color: "#9ca3af",
    marginBottom: "28px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginBottom: "28px",
  },
  statCard: {
    padding: "20px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "14px",
    textAlign: "center" as const,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    borderRadius: "100px",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "28px",
  },
  statusComplete: {
    background: "rgba(74, 222, 128, 0.15)",
    color: "#4ADE80",
  },
  statusPending: {
    background: "rgba(251, 191, 36, 0.15)",
    color: "#FBBF24",
  },
  winnersSection: {
    marginBottom: "28px",
  },
  winnersTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#9ca3af",
    marginBottom: "16px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  winnerList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  winnerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    background: "rgba(182, 245, 105, 0.1)",
    border: "1px solid rgba(182, 245, 105, 0.3)",
    borderRadius: "12px",
  },
  winnerRank: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #B6F569 0%, #4ADE80 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: "#000000",
  },
  winnerAddress: {
    flex: 1,
    fontSize: "14px",
    fontFamily: "monospace",
    color: "#FFFFFF",
    fontWeight: 500,
    textAlign: "left" as const,
  },
  divider: {
    width: "100%",
    height: "1px",
    background: "rgba(255, 255, 255, 0.1)",
    margin: "24px 0",
  },
  shareSection: {
    marginBottom: "20px",
  },
  shareTitle: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#9ca3af",
    marginBottom: "12px",
  },
  shareButtons: {
    display: "flex",
    gap: "12px",
  },
  shareButton: {
    flex: 1,
    padding: "14px 16px",
    background: "linear-gradient(135deg, #0052FF 0%, #60A5FA 100%)",
    border: "none",
    borderRadius: "10px",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.15s ease",
  },
  shareButtonX: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  },
  ctaButton: {
    width: "100%",
    padding: "16px 24px",
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "10px",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    textDecoration: "none",
    transition: "all 0.15s ease",
  },
  footer: {
    marginTop: "24px",
    fontSize: "12px",
    color: "#6b7280",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    color: "#FFFFFF",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "#0052FF",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  error: {
    fontSize: "18px",
    color: "#ef4444",
  },
};

// ── Main Component ────────────────────────────────────────────
export default function EventResultsPage() {
  const params = useParams();
  const eventId = params?.eventId as string;

  const [event, setEvent] = useState<ApiEventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkInUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${eventId}`
    : "";

  const resultsUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${eventId}/results`
    : "";

  // Fetch event data
  useEffect(() => {
    if (!eventId) return;

    const chainId = Number(eventId);
    if (isNaN(chainId) || chainId <= 0) {
      setError("Invalid event ID");
      setLoading(false);
      return;
    }

    apiGetEventSummary(chainId)
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Event not found");
        setLoading(false);
      });
  }, [eventId]);

  // Share handlers
  const handleShareFarcaster = () => {
    if (!event) return;
    const shareText = event.giveaway_executed 
      ? getWinnersShareText(event.title)
      : getCheckInShareText(event.title);
    shareOnFarcaster(shareText, resultsUrl);
  };

  const handleShareX = () => {
    if (!event) return;
    const shareText = event.giveaway_executed 
      ? getWinnersShareText(event.title)
      : getCheckInShareText(event.title);
    shareOnX(shareText, resultsUrl);
  };

  const truncAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span>Loading event...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.error}>{error || "Event not found"}</div>
      </div>
    );
  }

  const isComplete = event.giveaway_executed;
  const winners = event.winners || [];

  return (
    <div style={styles.page}>
      <div style={styles.glow} />

      <div style={styles.container}>
        {/* Back link */}
        <Link href="/" style={styles.backLink}>
          <ArrowLeft size={16} />
          Back to DropIn
        </Link>

        {/* Logo */}
        <div style={styles.logo}>
          <img src="/logo-icon.png" alt="DropIn" style={styles.logoImg} />
          <span style={styles.logoText}>DropIn</span>
        </div>

        {/* Main Card */}
        <div style={styles.card}>
          <h1 style={styles.title}>{event.title}</h1>
          <p style={styles.subtitle}>Onchain Event Check-In</p>

          {/* Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{event.attendee_count}</div>
              <div style={styles.statLabel}>Checked In</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{event.max_attendees ?? "∞"}</div>
              <div style={styles.statLabel}>Capacity</div>
            </div>
          </div>

          {/* Status Badge */}
          <div style={{
            ...styles.statusBadge,
            ...(isComplete ? styles.statusComplete : styles.statusPending)
          }}>
            {isComplete ? (
              <>
                <CheckCircle size={16} />
                Giveaway Complete
              </>
            ) : (
              <>
                <Clock size={16} />
                Giveaway Pending
              </>
            )}
          </div>

          {/* Winners Section */}
          {isComplete && winners.length > 0 && (
            <div style={styles.winnersSection}>
              <div style={styles.winnersTitle}>
                <Trophy size={14} style={{ marginRight: "6px" }} />
                Winners
              </div>
              <div style={styles.winnerList}>
                {winners.map((winner, i) => (
                  <div key={winner} style={styles.winnerRow}>
                    <div style={styles.winnerRank}>#{i + 1}</div>
                    <div style={styles.winnerAddress}>{truncAddr(winner)}</div>
                    <Trophy size={16} style={{ color: "#FBBF24" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.divider} />

          {/* Share Section */}
          <div style={styles.shareSection}>
            <div style={styles.shareTitle}>Share this event</div>
            <div style={styles.shareButtons}>
              <button style={styles.shareButton} onClick={handleShareFarcaster}>
                <Share2 size={16} />
                Farcaster
              </button>
              <button style={{ ...styles.shareButton, ...styles.shareButtonX }} onClick={handleShareX}>
                <span style={{ fontWeight: 700 }}>𝕏</span>
                Share
              </button>
            </div>
          </div>

          {/* CTA */}
          {!isComplete && (
            <Link href={checkInUrl} style={styles.ctaButton}>
              <Users size={18} />
              Check In Now
            </Link>
          )}

          {event.tx_hash && (
            <a
              href={`https://basescan.org/tx/${event.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.ctaButton, marginTop: "12px" }}
            >
              <ExternalLink size={16} />
              View on BaseScan
            </a>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          Powered by DropIn · Verified on Base
        </div>
      </div>
    </div>
  );
}
