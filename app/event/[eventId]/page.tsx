// ─────────────────────────────────────────────────────────────
//  app/event/[eventId]/page.tsx
//
//  Attendee check-in page.
//  Design: Telegram Mini App aesthetic — dark cards, chunky
//  rounded surfaces, vibrant amber/gold gradients, compact
//  mobile-first layout with a big CTA at the bottom.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Identity } from "@coinbase/onchainkit/identity";
import QRCode from "qrcode";

import {
  apiGetEventSummary,
  apiCheckIn,
  type ApiEventSummary,
} from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type CheckInState =
  | "idle"
  | "loading"
  | "success"
  | "already"
  | "locked"
  | "error";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function EventCheckInPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { address, isConnected } = useAccount();

  // ── State ───────────────────────────────────────────────────
  const [event, setEvent] = useState<ApiEventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [checkInState, setCheckInState] = useState<CheckInState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQr, setShowQr] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  // ── Deep link URL ───────────────────────────────────────────
  const checkInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/event/${eventId}`
      : "";

  // ── Load event data ─────────────────────────────────────────
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

  // ── Generate QR code ────────────────────────────────────────
  useEffect(() => {
    if (!checkInUrl) return;
    QRCode.toDataURL(checkInUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#e8e6e1", light: "#00000000" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, [checkInUrl]);

  // ── Check-in handler ────────────────────────────────────────
  const handleCheckIn = useCallback(async () => {
    if (!address || !event) return;

    setCheckInState("loading");
    setErrorMsg("");

    try {
      await apiCheckIn({
        eventId: event.id,
        walletAddress: address,
      });
      setCheckInState("success");

      // Refresh event data to update attendee count
      const chainId = Number(eventId);
      const updated = await apiGetEventSummary(chainId);
      setEvent(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong";

      if (msg.includes("Already checked in")) {
        setCheckInState("already");
      } else if (msg.includes("locked")) {
        setCheckInState("locked");
      } else {
        setCheckInState("error");
        setErrorMsg(msg);
      }
    }
  }, [address, event, eventId]);

  // ── Truncate address ────────────────────────────────────────
  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // ── Time formatter ──────────────────────────────────────────
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Loading
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (loading) {
    return (
      <div style={s.shell}>
        <div style={s.loaderWrap}>
          <div style={s.spinner} />
          <p style={s.loaderText}>Loading event...</p>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Not found
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (notFound || !event) {
    return (
      <div style={s.shell}>
        <div style={s.loaderWrap}>
          <div style={s.notFoundIcon}>?</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            Event not found
          </h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Event #{eventId} doesn&apos;t exist or hasn&apos;t been created
            yet.
          </p>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Main render
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div style={s.shell}>
      {/* ── Top glow effect ─────────────────────────────────── */}
      <div style={s.topGlow} />

      {/* ── Header bar ──────────────────────────────────────── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.backIcon}>←</span>
          <span style={s.headerLabel}>Check In</span>
        </div>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-5 w-5" />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </header>

      {/* ── Hero card ───────────────────────────────────────── */}
      <div style={s.heroCard}>
        {/* Decorative ring */}
        <div style={s.heroRing}>
          <div style={s.heroRingInner}>
            <span style={s.heroEmoji}>🎉</span>
          </div>
        </div>

        <h1 style={s.eventTitle}>{event.title}</h1>

        {event.description && (
          <p style={s.eventDesc}>{event.description}</p>
        )}

        <div style={s.metaRow}>
          <div style={s.metaPill}>
            <span style={s.metaPillIcon}>📅</span>
            {formatDate(event.created_at)}
          </div>
          <div style={s.metaPill}>
            <span style={s.metaPillIcon}>🏷</span>
            #{event.chain_event_id}
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <span style={s.statNumber}>{event.attendee_count}</span>
          <span style={s.statLabel}>Attendees</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statNumber}>
            {event.max_attendees ?? "∞"}
          </span>
          <span style={s.statLabel}>Capacity</span>
        </div>
        <div style={s.statCard}>
          <span
            style={{
              ...s.statNumber,
              color: event.is_locked ? "var(--red)" : "var(--green)",
            }}
          >
            {event.is_locked ? "🔒" : "🟢"}
          </span>
          <span style={s.statLabel}>
            {event.is_locked ? "Locked" : "Open"}
          </span>
        </div>
      </div>

      {/* ── Organizer ───────────────────────────────────────── */}
      <div style={s.orgCard}>
        <span style={s.orgLabel}>Hosted by</span>
        <span style={s.orgAddr}>{truncate(event.organizer)}</span>
      </div>

      {/* ── QR Code toggle ──────────────────────────────────── */}
      <button style={s.qrToggle} onClick={() => setShowQr(!showQr)}>
        <span>{showQr ? "Hide" : "Show"} QR Code</span>
        <span style={s.qrToggleIcon}>{showQr ? "▲" : "▼"}</span>
      </button>

      {showQr && qrDataUrl && (
        <div style={s.qrCard}>
          <img src={qrDataUrl} alt="Check-in QR" style={s.qrImage} />
          <p style={s.qrHint}>
            Share this QR so attendees can check in
          </p>
          <div style={s.qrUrlBox}>
            <span style={s.qrUrl}>{checkInUrl}</span>
            <button
              style={s.qrCopy}
              onClick={() => navigator.clipboard.writeText(checkInUrl)}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* ── Spacer ──────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 24 }} />

      {/* ── Bottom CTA area ─────────────────────────────────── */}
      <div style={s.bottomArea}>
        {!isConnected ? (
          /* Not connected */
          <div style={s.ctaCard}>
            <p style={s.ctaText}>Connect your wallet to check in</p>
            <Wallet>
              <ConnectWallet className="w-full" />
            </Wallet>
          </div>
        ) : checkInState === "success" ? (
          /* Success */
          <div style={s.successCard} ref={confettiRef}>
            <div style={s.successCheck}>✓</div>
            <h3 style={s.successTitle}>You&apos;re in! 🎊</h3>
            <p style={s.successSub}>
              Checked in as {truncate(address!)}
            </p>
            <p style={s.successHint}>
              You&apos;re now eligible for the giveaway draw.
            </p>
          </div>
        ) : checkInState === "already" ? (
          /* Already checked in */
          <div style={s.alreadyCard}>
            <div style={s.alreadyIcon}>👋</div>
            <h3 style={s.alreadyTitle}>Already checked in</h3>
            <p style={s.alreadySub}>
              {truncate(address!)} is registered for this event.
            </p>
          </div>
        ) : checkInState === "locked" ? (
          /* Event locked */
          <div style={s.lockedCard}>
            <div style={s.lockedIcon}>🔒</div>
            <h3 style={s.lockedTitle}>Event closed</h3>
            <p style={s.lockedSub}>
              The giveaway has already been drawn.
            </p>
          </div>
        ) : (
          /* Ready to check in */
          <div style={s.ctaCard}>
            <p style={s.ctaWallet}>
              Checking in as <strong>{truncate(address!)}</strong>
            </p>

            <button
              style={{
                ...s.checkInBtn,
                ...(checkInState === "loading" ? s.checkInBtnLoading : {}),
              }}
              onClick={handleCheckIn}
              disabled={checkInState === "loading" || event.is_locked}
            >
              {checkInState === "loading" ? (
                <span style={s.btnSpinner} />
              ) : event.is_locked ? (
                "Event Closed"
              ) : (
                "Check In →"
              )}
            </button>

            {checkInState === "error" && (
              <p style={s.errorText}>{errorMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Styles — Telegram Mini App aesthetic
//
//  Dark navy/charcoal surfaces, rounded 20px cards, amber
//  gradient CTA, compact vertical layout, playful badges.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const s: Record<string, React.CSSProperties> = {
  // Shell
  shell: {
    minHeight: "100dvh",
    maxWidth: 430,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    padding: "0 16px 24px",
  },

  // Top ambient glow
  topGlow: {
    position: "absolute",
    top: -80,
    left: "50%",
    transform: "translateX(-50%)",
    width: 320,
    height: 200,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse, rgba(217,119,6,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },

  // Header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 0",
    position: "relative",
    zIndex: 1,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  backIcon: {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  headerLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  },

  // Hero card
  heroCard: {
    position: "relative",
    zIndex: 1,
    background:
      "linear-gradient(145deg, #1c1a15 0%, var(--bg-card) 100%)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "28px 20px 20px",
    textAlign: "center" as const,
    marginBottom: 12,
  },
  heroRing: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background:
      "conic-gradient(from 0deg, var(--amber), #fbbf24, var(--amber), #92400e, var(--amber))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    padding: 3,
  },
  heroRingInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#1c1a15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: {
    fontSize: "1.8rem",
    lineHeight: 1,
  },
  eventTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.35rem",
    lineHeight: 1.25,
    letterSpacing: "-0.01em",
    marginBottom: 6,
  },
  eventDesc: {
    color: "var(--text-secondary)",
    fontSize: "0.88rem",
    lineHeight: 1.5,
    marginBottom: 14,
  },
  metaRow: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--text-secondary)",
  },
  metaPillIcon: {
    fontSize: "0.8rem",
  },

  // Stats row
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    marginBottom: 12,
    position: "relative",
    zIndex: 1,
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "14px 8px",
    borderRadius: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
  },
  statNumber: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.3rem",
    color: "var(--text-primary)",
  },
  statLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.65rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },

  // Organizer
  orgCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderRadius: 14,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    marginBottom: 12,
    position: "relative",
    zIndex: 1,
  },
  orgLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  orgAddr: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
  },

  // QR toggle
  qrToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    cursor: "pointer",
    marginBottom: 8,
    position: "relative",
    zIndex: 1,
  },
  qrToggleIcon: {
    fontSize: "0.65rem",
    color: "var(--text-muted)",
  },

  // QR card
  qrCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    borderRadius: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    marginBottom: 8,
    position: "relative",
    zIndex: 1,
    animation: "slideDown 0.2s ease",
  },
  qrImage: {
    width: 180,
    height: 180,
    marginBottom: 12,
  },
  qrHint: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    marginBottom: 10,
    textAlign: "center" as const,
  },
  qrUrlBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
  },
  qrUrl: {
    flex: 1,
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  qrCopy: {
    padding: "4px 10px",
    borderRadius: 6,
    background: "var(--amber-soft)",
    border: "none",
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    fontWeight: 500,
    color: "var(--amber)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },

  // Bottom CTA area
  bottomArea: {
    position: "relative",
    zIndex: 1,
  },
  ctaCard: {
    padding: "20px",
    borderRadius: 20,
    background:
      "linear-gradient(145deg, #1c1a15 0%, var(--bg-card) 100%)",
    border: "1px solid var(--border)",
    textAlign: "center" as const,
  },
  ctaText: {
    fontFamily: "var(--font-display)",
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    marginBottom: 16,
  },
  ctaWallet: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    marginBottom: 14,
  },

  // Check-in button
  checkInBtn: {
    width: "100%",
    padding: "16px 24px",
    borderRadius: 14,
    border: "none",
    background:
      "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #d97706 100%)",
    backgroundSize: "200% 200%",
    color: "#0c0c0e",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.05rem",
    letterSpacing: "0.01em",
    cursor: "pointer",
    transition: "transform 0.1s, box-shadow 0.2s",
    boxShadow: "0 4px 24px rgba(217, 119, 6, 0.3)",
    position: "relative",
    overflow: "hidden",
  },
  checkInBtnLoading: {
    opacity: 0.7,
    cursor: "wait",
  },
  btnSpinner: {
    display: "inline-block",
    width: 20,
    height: 20,
    border: "2.5px solid rgba(12,12,14,0.3)",
    borderTopColor: "#0c0c0e",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },

  // Success state
  successCard: {
    padding: "28px 20px",
    borderRadius: 20,
    background:
      "linear-gradient(145deg, #0a1f0e 0%, #0f1a12 100%)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    textAlign: "center" as const,
    position: "relative",
    overflow: "hidden",
  },
  successCheck: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "var(--green)",
    color: "#0c0c0e",
    fontSize: "1.6rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
    boxShadow: "0 0 32px rgba(34, 197, 94, 0.3)",
    animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  successTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.25rem",
    color: "var(--green)",
    marginBottom: 6,
  },
  successSub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    marginBottom: 4,
  },
  successHint: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--text-muted)",
  },

  // Already checked in
  alreadyCard: {
    padding: "24px 20px",
    borderRadius: 20,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    textAlign: "center" as const,
  },
  alreadyIcon: {
    fontSize: "2rem",
    marginBottom: 8,
  },
  alreadyTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: "1.1rem",
    marginBottom: 6,
  },
  alreadySub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
  },

  // Locked
  lockedCard: {
    padding: "24px 20px",
    borderRadius: 20,
    background:
      "linear-gradient(145deg, #1a1012 0%, var(--bg-card) 100%)",
    border: "1px solid rgba(239, 68, 68, 0.15)",
    textAlign: "center" as const,
  },
  lockedIcon: {
    fontSize: "2rem",
    marginBottom: 8,
  },
  lockedTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: "1.1rem",
    color: "var(--red)",
    marginBottom: 6,
  },
  lockedSub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
  },

  // Error
  errorText: {
    marginTop: 10,
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    color: "var(--red)",
  },

  // Loader
  loaderWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    padding: "2rem",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid var(--border)",
    borderTopColor: "var(--amber)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    marginBottom: 16,
  },
  loaderText: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-muted)",
  },
  notFoundIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    marginBottom: 16,
  },
};
