// ─────────────────────────────────────────────────────────────
//  app/event/[eventId]/page.tsx — Attendee Check-in Page
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  CheckCircle,
  Users,
  Lock,
  AlertCircle,
  Loader2,
  Wallet,
  PartyPopper,
  Share2,
  Gift,
  Award,
  Star,
  Mail,
} from "lucide-react";
import { apiGetEventSummary, apiCheckIn, type ApiEventSummary } from "@/lib/api";
import { shareOnFarcaster, shareOnX, getCheckInShareText } from "@/lib/share";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────
type CheckInState = "idle" | "loading" | "success" | "already" | "locked" | "error";

interface AttendeeStats {
  totalCheckIns: number;
  loading: boolean;
}

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
  giveawayBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "var(--amber-glow)",
    borderRadius: "var(--radius-full)",
    marginTop: "16px",
    marginBottom: "24px",
    color: "var(--amber)",
    fontSize: "14px",
    fontWeight: 500,
  },
  shareSection: {
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  },
  shareTitle: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "12px",
  },
  shareButtons: {
    display: "flex",
    gap: "12px",
  },
  shareButton: {
    flex: 1,
    padding: "12px 16px",
    background: "var(--gradient-primary)",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all var(--transition-fast)",
  },
  shareButtonX: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  },
  attendeeStatsCard: {
    marginTop: "20px",
    padding: "16px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
  },
  attendeeStatsText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    marginBottom: "8px",
  },
  badgeContainer: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "var(--radius-full)",
    fontSize: "12px",
    fontWeight: 600,
  },
  badgeRegular: {
    background: "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)",
    color: "#FBBF24",
  },
  badgeOG: {
    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)",
    color: "#A78BFA",
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
  // Email capture styles
  emailPrompt: {
    marginTop: "20px",
    padding: "16px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
  },
  emailPromptTitle: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "4px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  emailPromptText: {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginBottom: "12px",
  },
  emailForm: {
    display: "flex",
    gap: "8px",
  },
  emailInput: {
    flex: 1,
    padding: "10px 12px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
  },
  emailSubmitButton: {
    padding: "10px 16px",
    background: "var(--gradient-amber)",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "var(--text-inverse)",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap" as const,
  },
  emailSuccess: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    background: "var(--green-glow)",
    borderRadius: "var(--radius-md)",
    color: "var(--green)",
    fontSize: "14px",
    fontWeight: 500,
  },
};

// ── Main Component ────────────────────────────────────────────
export default function CheckInPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params?.eventId as string;
  const qrToken = searchParams?.get("t") ?? undefined; // Rotating QR token
  const { address: walletAddress, isConnected, isConnecting } = useAccount();
  const { open } = useAppKit();
  const ready = !isConnecting;

  // State
  const [event, setEvent] = useState<ApiEventSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [checkInState, setCheckInState] = useState<CheckInState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [attendeeStats, setAttendeeStats] = useState<AttendeeStats>({ totalCheckIns: 0, loading: false });
  const [tokenExpired, setTokenExpired] = useState<boolean>(false);
  
  // Email capture state
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const userEmail: string | undefined = undefined; // No email with wallet-only auth
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

  // Fetch attendee stats when wallet is connected
  useEffect(() => {
    if (!walletAddress) return;

    setAttendeeStats(prev => ({ ...prev, loading: true }));
    
    fetch(`/api/checkins?wallet=${encodeURIComponent(walletAddress)}`)
      .then(res => res.json())
      .then(data => {
        if (typeof data.count === 'number') {
          setAttendeeStats({ totalCheckIns: data.count, loading: false });
        } else {
          setAttendeeStats(prev => ({ ...prev, loading: false }));
        }
      })
      .catch(() => {
        setAttendeeStats(prev => ({ ...prev, loading: false }));
      });
  }, [walletAddress]);

  // Check-in handler
  const handleCheckIn = useCallback(async () => {
    if (!walletAddress || !event) return;

    setCheckInState("loading");
    setErrorMsg("");
    setTokenExpired(false);

    try {
      await apiCheckIn({
        eventId: event.id,
        walletAddress,
        token: qrToken,
      });
      setCheckInState("success");

      // Refresh event data
      const chainId = Number(eventId);
      const updated = await apiGetEventSummary(chainId);
      setEvent(updated);

      // Increment local attendee stats
      setAttendeeStats(prev => ({ ...prev, totalCheckIns: prev.totalCheckIns + 1 }));

      // Auto-capture email if user has one linked via Privy
      if (userEmail) {
        try {
          await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userEmail,
              source: "post-checkin",
              wallet: walletAddress,
            }),
          });
          setEmailStatus("success");
        } catch {
          // Silent fail - not critical
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";

      if (msg.includes("Already checked in")) {
        setCheckInState("already");
      } else if (msg.includes("locked")) {
        setCheckInState("locked");
      } else if (msg.includes("QR code expired") || msg.includes("expired")) {
        setTokenExpired(true);
        setCheckInState("error");
        setErrorMsg("QR code expired — please scan the current code");
      } else {
        setCheckInState("error");
        setErrorMsg(msg);
      }
    }
  }, [walletAddress, event, eventId, userEmail, qrToken]);

  // Email subscribe handler
  const handleEmailSubscribe = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || emailStatus === "loading") return;

    setEmailStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          source: "post-checkin",
          wallet: walletAddress,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }

      setEmailStatus("success");
    } catch {
      setEmailStatus("error");
    }
  }, [emailInput, emailStatus, walletAddress]);

  // Share handlers
  const handleShareFarcaster = () => {
    if (!event) return;
    const shareText = getCheckInShareText(event.title);
    const url = typeof window !== "undefined" ? `${window.location.origin}/event/${eventId}` : "";
    shareOnFarcaster(shareText, url);
  };

  const handleShareX = () => {
    if (!event) return;
    const shareText = getCheckInShareText(event.title);
    const url = typeof window !== "undefined" ? `${window.location.origin}/event/${eventId}` : "";
    shareOnX(shareText, url);
  };

  // Get badge based on check-in count
  const getBadge = () => {
    const count = attendeeStats.totalCheckIns;
    if (count >= 10) {
      return { label: "⭐ Base Event OG", style: styles.badgeOG };
    }
    if (count >= 3) {
      return { label: "🏅 DropIn Regular", style: styles.badgeRegular };
    }
    return null;
  };

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

  // Success state with share buttons
  if (checkInState === "success") {
    const badge = getBadge();

    return (
      <div style={styles.page}>
        <div style={styles.glow} />
        <div style={styles.container}>
          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              <PartyPopper size={32} />
            </div>
            <div style={styles.successTitle}>✅ You&apos;re checked in!</div>
            <div style={styles.successText}>
              Successfully checked in to {event.title}.
            </div>
            
            {/* Giveaway eligibility badge */}
            <div style={styles.giveawayBadge}>
              <Gift size={16} />
              You&apos;re eligible for today&apos;s giveaway
            </div>

            {/* Attendee stats */}
            <div style={styles.attendeeStatsCard}>
              <div style={styles.attendeeStatsText}>
                You&apos;ve attended <strong>{attendeeStats.totalCheckIns}</strong> DropIn event{attendeeStats.totalCheckIns !== 1 ? 's' : ''}
              </div>
              {badge && (
                <div style={styles.badgeContainer}>
                  <span style={{ ...styles.badge, ...badge.style }}>{badge.label}</span>
                </div>
              )}
            </div>

            {/* Share section */}
            <div style={styles.shareSection}>
              <div style={styles.shareTitle}>Share your check-in</div>
              <div style={styles.shareButtons} className="share-buttons-mobile">
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

            {/* Email capture prompt (only if user doesn't have email linked) */}
            {!userEmail && (
              <div style={styles.emailPrompt}>
                {emailStatus === "success" ? (
                  <div style={styles.emailSuccess}>
                    <CheckCircle size={16} />
                    You&apos;re subscribed! 🎉
                  </div>
                ) : (
                  <>
                    <div style={styles.emailPromptTitle}>
                      <Mail size={16} />
                      Want updates?
                    </div>
                    <div style={styles.emailPromptText}>
                      Get notified about new events and features
                    </div>
                    <form onSubmit={handleEmailSubscribe} style={styles.emailForm}>
                      <input
                        type="email"
                        placeholder="Your email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        style={styles.emailInput}
                        disabled={emailStatus === "loading"}
                      />
                      <button
                        type="submit"
                        style={{
                          ...styles.emailSubmitButton,
                          opacity: emailStatus === "loading" ? 0.7 : 1,
                        }}
                        disabled={emailStatus === "loading"}
                      >
                        {emailStatus === "loading" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          "Subscribe"
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* Show success if email was auto-captured */}
            {userEmail && emailStatus === "success" && (
              <div style={styles.emailPrompt}>
                <div style={styles.emailSuccess}>
                  <CheckCircle size={16} />
                  Email saved for updates
                </div>
              </div>
            )}
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
    const badge = getBadge();

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
            
            {/* Giveaway eligibility badge */}
            <div style={styles.giveawayBadge}>
              <Gift size={16} />
              You&apos;re eligible for today&apos;s giveaway
            </div>

            {/* Attendee stats */}
            <div style={styles.attendeeStatsCard}>
              <div style={styles.attendeeStatsText}>
                You&apos;ve attended <strong>{attendeeStats.totalCheckIns}</strong> DropIn event{attendeeStats.totalCheckIns !== 1 ? 's' : ''}
              </div>
              {badge && (
                <div style={styles.badgeContainer}>
                  <span style={{ ...styles.badge, ...badge.style }}>{badge.label}</span>
                </div>
              )}
            </div>

            {/* Share section */}
            <div style={styles.shareSection}>
              <div style={styles.shareTitle}>Share your check-in</div>
              <div style={styles.shareButtons} className="share-buttons-mobile">
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
              {tokenExpired ? (
                <span style={{ fontSize: "32px" }}>⏰</span>
              ) : (
                <AlertCircle size={32} />
              )}
            </div>
            <div style={styles.successTitle}>
              {tokenExpired ? "QR Code Expired" : "Check-in failed"}
            </div>
            <div style={styles.successText}>
              {tokenExpired 
                ? "This QR code has expired. Please scan the current code displayed at the event."
                : (errorMsg || "Something went wrong. Please try again.")}
            </div>
            {tokenExpired ? (
              <div style={{ marginTop: "20px", fontSize: "14px", color: "var(--text-muted)" }}>
                📱 Look for the QR code on the event screen
              </div>
            ) : (
              <button
                style={{ ...styles.buttonSecondary, marginTop: "20px" }}
                onClick={() => setCheckInState("idle")}
              >
                Try Again
              </button>
            )}
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
          {isConnected && walletAddress ? (
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
            <button style={styles.buttonPrimary} onClick={() => open()}>
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
