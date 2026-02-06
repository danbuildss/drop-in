// ─────────────────────────────────────────────────────────────
//  app/event/[eventId]/qr/page.tsx — Shareable QR Code Display
//  
//  Public page for displaying QR code at events.
//  Optimized for big screens and mobile scanning.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiGetEventSummary, type ApiEventSummary } from "@/lib/api";
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
    marginBottom: "32px",
  },
  qrImage: {
    display: "block",
    width: "min(300px, 70vw)",
    height: "min(300px, 70vw)",
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

  const checkInUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${eventId}`
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

  // Generate QR code (dynamic import to avoid SSR issues)
  useEffect(() => {
    if (!checkInUrl) return;
    
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(checkInUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }).then(setQrDataUrl).catch(console.error);
    }).catch(console.error);
  }, [checkInUrl]);

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
      
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logo}>
          <img src="/logo-icon.png" alt="DropIn" style={styles.logoImg} />
          <span style={styles.logoText}>DropIn</span>
        </div>

        {/* Event Title */}
        <h1 style={styles.title}>{event.title}</h1>
        <p style={styles.subtitle}>Scan to check in for the giveaway</p>

        {/* QR Code */}
        {qrDataUrl && (
          <div style={styles.qrWrapper}>
            <img src={qrDataUrl} alt="Check-in QR Code" style={styles.qrImage} />
          </div>
        )}

        {/* Instructions */}
        <p style={styles.instructions}>📱 Open camera & scan</p>
        <p style={styles.instructionsSub}>Connect wallet to enter the giveaway</p>

        {/* Live attendee count */}
        <div style={styles.attendeeCount}>
          <div style={styles.dot} />
          {event.attendee_count} checked in
        </div>

        {/* URL fallback */}
        <div style={styles.url}>{checkInUrl}</div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        Powered by DropIn · Verified on Base
      </div>
    </div>
  );
}
