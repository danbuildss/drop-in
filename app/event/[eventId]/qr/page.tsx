// ─────────────────────────────────────────────────────────────
//  app/event/[eventId]/qr/page.tsx — Shareable QR Code Display
//  
//  Public page for displaying QR code at events.
//  QR code rotates every 30 seconds to prevent screenshot fraud.
//  Optimized for big screens and mobile scanning.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiGetEventSummary, type ApiEventSummary } from "@/lib/api";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────
interface QRTokenResponse {
  token: string;
  expiresAt: number;
  secondsRemaining: number;
  bucketSize: number;
}

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
    textAlign: "center",
    maxWidth: "500px",
    width: "100%",
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
  title: {
    fontSize: "clamp(24px, 5vw, 36px)",
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: "8px",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: "16px",
    color: "#9ca3af",
    marginBottom: "40px",
  },
  qrWrapper: {
    padding: "24px",
    background: "#FFFFFF",
    borderRadius: "24px",
    boxShadow: "0 0 60px rgba(0, 82, 255, 0.3)",
    marginBottom: "16px",
    position: "relative",
  },
  qrImage: {
    display: "block",
    width: "min(300px, 70vw)",
    height: "min(300px, 70vw)",
    transition: "opacity 0.2s ease",
  },
  rotationIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "rgba(0, 82, 255, 0.2)",
    borderRadius: "100px",
    marginBottom: "24px",
    border: "1px solid rgba(0, 82, 255, 0.3)",
  },
  rotationText: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#3C8AFF",
  },
  rotationCountdown: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#FFFFFF",
    minWidth: "32px",
  },
  rotationIcon: {
    width: "16px",
    height: "16px",
    animation: "spin 2s linear infinite",
  },
  securityBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "rgba(74, 222, 128, 0.1)",
    borderRadius: "100px",
    marginBottom: "20px",
    border: "1px solid rgba(74, 222, 128, 0.3)",
  },
  securityText: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#4ADE80",
  },
  instructions: {
    fontSize: "18px",
    color: "#FFFFFF",
    fontWeight: 500,
    marginBottom: "8px",
  },
  instructionsSub: {
    fontSize: "14px",
    color: "#6b7280",
  },
  url: {
    marginTop: "24px",
    padding: "12px 20px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    fontSize: "14px",
    color: "#3C8AFF",
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
  footer: {
    position: "absolute",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
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
  attendeeCount: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "24px",
    padding: "12px 24px",
    background: "rgba(74, 222, 128, 0.1)",
    border: "1px solid rgba(74, 222, 128, 0.3)",
    borderRadius: "100px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#4ADE80",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#4ADE80",
    animation: "pulse 2s ease-in-out infinite",
  },
};

// ── Main Component ────────────────────────────────────────────
export default function QRDisplayPage() {
  const params = useParams();
  const eventId = params?.eventId as string;

  const [event, setEvent] = useState<ApiEventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [currentToken, setCurrentToken] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Build check-in URL with token
  const getCheckInUrl = useCallback((token: string) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/event/${eventId}?t=${token}`;
  }, [eventId]);

  // Fetch new token from server
  const fetchToken = useCallback(async (): Promise<QRTokenResponse | null> => {
    try {
      const res = await fetch(`/api/qr-token?eventId=${eventId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [eventId]);

  // Generate QR code for a URL
  const generateQRCode = useCallback(async (url: string) => {
    try {
      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      return dataUrl;
    } catch {
      return null;
    }
  }, []);

  // Refresh token and QR code
  const refreshQR = useCallback(async () => {
    setIsRefreshing(true);
    const tokenData = await fetchToken();
    
    if (tokenData) {
      setCurrentToken(tokenData.token);
      setCountdown(tokenData.secondsRemaining);
      
      const url = getCheckInUrl(tokenData.token);
      const qr = await generateQRCode(url);
      if (qr) setQrDataUrl(qr);
    }
    
    setIsRefreshing(false);
  }, [fetchToken, getCheckInUrl, generateQRCode]);

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

  // Initial token fetch and setup
  useEffect(() => {
    if (!eventId || loading || error) return;

    // Initial fetch
    refreshQR();

    // Set up countdown timer (decrements every second)
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Time to refresh - trigger refresh and reset
          refreshQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [eventId, loading, error, refreshQR]);

  // Auto-refresh attendee count every 10 seconds
  useEffect(() => {
    if (!eventId || error) return;

    const interval = setInterval(() => {
      const chainId = Number(eventId);
      if (!isNaN(chainId)) {
        apiGetEventSummary(chainId)
          .then(setEvent)
          .catch(console.error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [eventId, error]);

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

  return (
    <div style={styles.page}>
      <div style={styles.glow} />
      
      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logo}>
          <img src="/logo-icon.png" alt="DropIn" style={styles.logoImg} />
          <span style={styles.logoText}>DropIn</span>
        </div>

        {/* Event Title */}
        <h1 style={styles.title}>{event.title}</h1>
        <p style={styles.subtitle}>Scan to check in for the giveaway</p>

        {/* Security badge */}
        <div style={styles.securityBadge}>
          <span>🔒</span>
          <span style={styles.securityText}>Anti-fraud protected</span>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div style={styles.qrWrapper}>
            <img 
              src={qrDataUrl} 
              alt="Check-in QR Code" 
              style={{
                ...styles.qrImage,
                opacity: isRefreshing ? 0.5 : 1,
              }} 
            />
          </div>
        )}

        {/* Rotation indicator with countdown */}
        <div style={styles.rotationIndicator}>
          <svg 
            style={styles.rotationIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span style={styles.rotationText}>QR updates in</span>
          <span style={styles.rotationCountdown}>{countdown}s</span>
        </div>

        {/* Instructions */}
        <p style={styles.instructions}>📱 Open camera & scan</p>
        <p style={styles.instructionsSub}>Connect wallet to enter the giveaway</p>

        {/* Live attendee count */}
        <div style={styles.attendeeCount}>
          <div style={styles.dot} />
          {event.attendee_count} checked in
        </div>

        {/* URL fallback (without token for display) */}
        <div style={styles.url}>
          dropin.whybase.xyz/event/{eventId}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        Powered by DropIn · Verified on Base
      </div>
    </div>
  );
}
