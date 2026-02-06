// ─────────────────────────────────────────────────────────────
//  app/event/[eventId]/page.tsx — Attendee Check-in Page
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  CheckCircle,
  Users,
  Lock,
  AlertCircle,
  Loader2,
  Wallet,
  PartyPopper,
} from "lucide-react";
import { apiGetEventSummary, apiCheckIn, type ApiEventSummary } from "@/lib/api";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────
type CheckInState = "idle" | "loading" | "success" | "already" | "locked" | "error";

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "var(--bg-base)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    position: "relative",
  },
  glow: {
    position: "absolute",
    top: "0",
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    height: "400px",
    background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0, 82, 255, 0.15), transparent 70%)",
    pointerEvents: "none",
  },
  container: {
    width: "100%",
    maxWidth: "400px",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    padding: "32px 24px",
    backdropFilter: "blur(10px)",
    textAlign: "center" as const,
  },
  logo: {
    width: "64px",
    height: "64px",
    borderRadius: "var(--radius-lg)",
    background: "var(--gradient-amber)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    fontSize: "28px",
  },
  eventTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "8px",
    lineHeight: 1.3,
  },
  eventDescription: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    marginBottom: "24px",
    lineHeight: 1.5,
  },
  statsRow: {
    display: "flex",
    justifyContent: "center",
    gap: "24px",
    marginBottom: "28px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  statLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  divider: {
    height: "32px",
    width: "1px",
    background: "var(--border-default)",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    borderRadius: "var(--radius-full)",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "24px",
  },
  statusLive: {
    background: "var(--green-glow)",
    color: "var(--green)",
  },
  statusLocked: {
    background: "var(--bg-elevated)",
    color: "var(--text-muted)",
  },
  walletInfo: {
    padding: "14px 16px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  walletAddress: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    fontFamily: "monospace",
  },
  walletIcon: {
    color: "var(--amber)",
  },
  buttonPrimary: {
    width: "100%",
    padding: "16px 24px",
    background: "var(--gradient-amber)",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "var(--text-inverse)",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all var(--transition-fast)",
    boxShadow: "0 4px 20px var(--amber-glow)",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  buttonSecondary: {
    width: "100%",
    padding: "16px 24px",
    background: "transparent",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "16px",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all var(--transition-fast)",
  },
  successCard: {
    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 24px",
    textAlign: "center" as const,
  },
  successIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-full)",
    background: "var(--green-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "var(--green)",
    animation: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  successTitle: {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "8px",
  },
  successText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  alreadyCard: {
    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 24px",
    textAlign: "center" as const,
  },
  alreadyIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-full)",
    background: "var(--blue-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "var(--blue)",
  },
  lockedCard: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 24px",
    textAlign: "center" as const,
  },
  lockedIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-full)",
    background: "var(--bg-card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "var(--text-muted)",
  },
  errorCard: {
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 24px",
    textAlign: "center" as const,
  },
  errorIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-full)",
    background: "var(--red-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "var(--red)",
  },
  errorText: {
    fontSize: "14px",
    color: "var(--red)",
    marginTop: "8px",
  },
  loadingCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    padding: "60px 24px",
    textAlign: "center" as const,
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--border-default)",
    borderTopColor: "var(--amber)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 16px",
  },
  loadingText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  notFoundCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    padding: "48px 24px",
    textAlign: "center" as const,
  },
  notFoundIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "var(--radius-lg)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "var(--text-muted)",
    fontSize: "28px",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  footerLink: {
    color: "var(--amber)",
    textDecoration: "none",
  },
};

// ── Main Component ────────────────────────────────────────────
export default function CheckInPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const { login, authenticated, user, ready } = usePrivy();

  // State
  const [event, setEvent] = useState<ApiEventSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [checkInState, setCheckInState] = useState<CheckInState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const walletAddress = user?.wallet?.address;
  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  // Fetch event data
  useEffect(() => {
    if (!eventId) return;

    const chainId = Number(eventId);
    if (isNaN(chainId) || chainId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    apiGetEventSummary(chainId)
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [eventId]);

  // Check-in handler
  const handleCheckIn = useCallback(async () => {
    if (!walletAddress || !event) return;

    setCheckInState("loading");
    setErrorMsg("");

    try {
      await apiCheckIn({
        eventId: event.id,
        walletAddress,
      });
      setCheckInState("success");

      // Refresh event data
      const chainId = Number(eventId);
      const updated = await apiGetEventSummary(chainId);
      setEvent(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";

      if (msg.includes("Already checked in")) {
        setCheckInState("already");
      } else if (msg.includes("locked")) {
        setCheckInState("locked");
      } else {
        setCheckInState("error");
        setErrorMsg(msg);
      }
    }
  }, [walletAddress, event, eventId]);

  // Loading state
  if (!ready || loading) {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.container}>
          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>Loading event...</div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound || !event) {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.container}>
          <div style={styles.notFoundCard}>
            <div style={styles.notFoundIcon}>📭</div>
            <div style={styles.eventTitle}>Event not found</div>
            <div style={styles.eventDescription}>
              This event doesn&apos;t exist or has been removed.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (checkInState === "success") {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.container}>
          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              <PartyPopper size={32} />
            </div>
            <div style={styles.successTitle}>You&apos;re in!</div>
            <div style={styles.successText}>
              Successfully checked in to {event.title}. Good luck in the giveaway!
            </div>
          </div>
          <div style={styles.footer}>
            <span style={styles.footerText}>
              Powered by{" "}
              <a href="/" style={styles.footerLink}>
                DropIn
              </a>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Already checked in state
  if (checkInState === "already") {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.container}>
          <div style={styles.alreadyCard}>
            <div style={styles.alreadyIcon}>
              <CheckCircle size={32} />
            </div>
            <div style={styles.successTitle}>Already checked in</div>
            <div style={styles.successText}>
              You&apos;ve already checked in to this event. Good luck!
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Locked state
  if (checkInState === "locked" || event.is_locked) {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.container}>
          <div style={styles.lockedCard}>
            <div style={styles.lockedIcon}>
              <Lock size={32} />
            </div>
            <div style={styles.successTitle}>Event closed</div>
            <div style={styles.successText}>
              Check-ins are no longer available. The giveaway has been completed.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (checkInState === "error") {
    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.container}>
          <div style={styles.errorCard}>
            <div style={styles.errorIcon}>
              <AlertCircle size={32} />
            </div>
            <div style={styles.successTitle}>Check-in failed</div>
            <div style={styles.successText}>
              {errorMsg || "Something went wrong. Please try again."}
            </div>
            <button
              style={{ ...styles.buttonSecondary, marginTop: "20px" }}
              onClick={() => setCheckInState("idle")}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: check-in form
  return (
    <div style={styles.page}>
      <div style={styles.glow} />
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}><img src="/logo-icon.png" alt="DropIn" style={{ width: "40px", height: "40px", borderRadius: "12px" }} /></div>
          <h1 style={styles.eventTitle}>{event.title}</h1>
          {event.description && (
            <p style={styles.eventDescription}>{event.description}</p>
          )}

          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{event.attendee_count}</div>
              <div style={styles.statLabel}>Checked In</div>
            </div>
            <div style={styles.divider} />
            <div style={styles.stat}>
              <div style={styles.statValue}>{event.max_attendees ?? "∞"}</div>
              <div style={styles.statLabel}>Capacity</div>
            </div>
          </div>

          {/* Status badge */}
          <div style={{ ...styles.statusBadge, ...styles.statusLive }}>
            <CheckCircle size={14} />
            Open for check-in
          </div>

          {/* Wallet connection / Check-in */}
          {authenticated && walletAddress ? (
            <>
              <div style={styles.walletInfo}>
                <Wallet size={16} style={styles.walletIcon} />
                <span style={styles.walletAddress}>{displayAddress}</span>
              </div>
              <button
                style={{
                  ...styles.buttonPrimary,
                  ...(checkInState === "loading" ? styles.buttonDisabled : {}),
                }}
                onClick={handleCheckIn}
                disabled={checkInState === "loading"}
              >
                {checkInState === "loading" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Check In
                  </>
                )}
              </button>
            </>
          ) : (
            <button style={styles.buttonPrimary} onClick={login}>
              <Wallet size={18} />
              Connect Wallet to Check In
            </button>
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.footerText}>
            Powered by{" "}
            <a href="/" style={styles.footerLink}>
              DropIn
            </a>
            {" · "}Verified on Base
          </span>
        </div>
      </div>
    </div>
  );
}
