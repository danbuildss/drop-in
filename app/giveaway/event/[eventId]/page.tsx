// ─────────────────────────────────────────────────────────────
//  app/giveaway/event/[eventId]/page.tsx — Event Management
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Users,
  Trophy,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  ArrowLeft,
  QrCode,
} from "lucide-react";
import Link from "next/link";
// QRCode imported dynamically to avoid SSR canvas issues
import {
  apiGetEventSummary,
  apiGetAttendees,
  apiCreateGiveaway,
  apiFinalizeGiveaway,
  type ApiEventSummary,
  type ApiCheckIn,
} from "@/lib/api";
import {
  createPublicClient,
  http,
  decodeEventLog,
  type Address,
} from "viem";
import { base } from "viem/chains";
import {
  DROP_IN_GIVEAWAY_ADDRESS,
  dropInGiveawayAbi,
} from "@/lib/calls";
import type { CSSProperties } from "react";

// ── Viem client ───────────────────────────────────────────────
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginBottom: "24px",
    textDecoration: "none",
    transition: "color var(--transition-fast)",
  },
  header: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "8px",
  },
  description: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 380px",
    gap: "24px",
  },
  mainColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  sideColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "24px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    padding: "20px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
    textAlign: "center" as const,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  statLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  attendeeList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "400px",
    overflowY: "auto" as const,
  },
  attendeeRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
  },
  attendeeNumber: {
    width: "28px",
    height: "28px",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  attendeeAddress: {
    flex: 1,
    fontSize: "14px",
    fontFamily: "monospace",
    color: "var(--text-primary)",
  },
  attendeeTime: {
    fontSize: "12px",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center" as const,
    color: "var(--text-muted)",
  },
  qrContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  qrCode: {
    padding: "16px",
    background: "white",
    borderRadius: "var(--radius-md)",
  },
  linkBox: {
    width: "100%",
    padding: "12px 16px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  linkText: {
    flex: 1,
    fontSize: "13px",
    color: "var(--text-secondary)",
    fontFamily: "monospace",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  iconButton: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-card)",
    border: "1px solid var(--border-default)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    cursor: "pointer",
  },
  drawSection: {
    borderTop: "1px solid var(--border-subtle)",
    paddingTop: "24px",
    marginTop: "8px",
  },
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "6px",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  buttonPrimary: {
    width: "100%",
    padding: "14px 20px",
    background: "var(--gradient-amber)",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "var(--text-inverse)",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all var(--transition-fast)",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  warning: {
    padding: "12px 16px",
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    borderRadius: "var(--radius-md)",
    marginBottom: "16px",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  warningIcon: {
    color: "#FBBF24",
    flexShrink: 0,
    marginTop: "2px",
  },
  warningText: {
    fontSize: "13px",
    color: "#FBBF24",
    lineHeight: 1.5,
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
    padding: "12px 16px",
    background: "rgba(182, 245, 105, 0.1)",
    border: "1px solid rgba(182, 245, 105, 0.3)",
    borderRadius: "var(--radius-md)",
  },
  winnerRank: {
    width: "28px",
    height: "28px",
    borderRadius: "var(--radius-sm)",
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
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  successBanner: {
    padding: "16px 20px",
    background: "var(--green-glow)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "var(--radius-md)",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  successText: {
    fontSize: "14px",
    color: "var(--green)",
    fontWeight: 500,
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid transparent",
    borderTopColor: "currentColor",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
};

// ── Main Component ────────────────────────────────────────────
export default function EventManagementPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  // State
  const [event, setEvent] = useState<ApiEventSummary | null>(null);
  const [attendees, setAttendees] = useState<ApiCheckIn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [winnerCount, setWinnerCount] = useState<string>("1");
  const [drawing, setDrawing] = useState<boolean>(false);
  const [winners, setWinners] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const checkInUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/event/${eventId}` 
    : "";

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    
    const chainId = Number(eventId);
    if (isNaN(chainId)) return;

    setLoading(true);
    try {
      const eventData = await apiGetEventSummary(chainId);
      setEvent(eventData);

      if (eventData.winners && eventData.winners.length > 0) {
        setWinners(eventData.winners);
      }

      const attendeeData = await apiGetAttendees(eventData.id);
      setAttendees(attendeeData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate QR code (dynamic import to avoid SSR canvas issues)
  useEffect(() => {
    if (!checkInUrl) return;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(checkInUrl, {
        width: 180,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setQrDataUrl).catch(console.error);
    }).catch(console.error);
  }, [checkInUrl]);

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run giveaway (simplified - in production you'd use Privy's sendTransaction)
  const handleRunGiveaway = async () => {
    if (!event || !walletAddress) return;

    const count = parseInt(winnerCount, 10);
    if (isNaN(count) || count <= 0 || count > attendees.length) return;

    setDrawing(true);
    try {
      // Create giveaway record
      const giveaway = await apiCreateGiveaway({
        eventId: event.id,
        winnerCount: count,
      });

      // In a real implementation, you would:
      // 1. Use Privy's sendTransaction to call runGiveaway on the contract
      // 2. Wait for the transaction receipt
      // 3. Decode the GiveawayWinners event from the logs
      // 4. Finalize with the actual winners

      // For now, we'll simulate random selection
      const shuffled = [...attendees].sort(() => Math.random() - 0.5);
      const selectedWinners = shuffled.slice(0, count).map((a) => a.wallet_address);

      await apiFinalizeGiveaway({
        giveawayId: giveaway.id,
        winners: selectedWinners,
        txHash: "0x" + "0".repeat(64), // Placeholder
      });

      setWinners(selectedWinners);
      await fetchData();
    } catch (err) {
      console.error("Failed to run giveaway:", err);
    } finally {
      setDrawing(false);
    }
  };

  const truncAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (loading) {
    return (
      <DashboardLayout title="Loading...">
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={styles.spinner} />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout title="Event Not Found">
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          Event not found
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link href="/giveaway" style={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div style={styles.header}>
        <h1 style={styles.title}>{event.title}</h1>
        {event.description && (
          <p style={styles.description}>{event.description}</p>
        )}
      </div>

      {event.giveaway_executed && winners.length > 0 && (
        <div style={styles.successBanner}>
          <CheckCircle size={20} style={{ color: "var(--green)" }} />
          <span style={styles.successText}>
            Giveaway complete! {winners.length} winner{winners.length > 1 ? "s" : ""} selected.
          </span>
        </div>
      )}

      <div style={styles.grid}>
        {/* Main Column */}
        <div style={styles.mainColumn}>
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
            <div style={styles.statCard}>
              <div style={styles.statValue}>
                {event.giveaway_executed ? (
                  <CheckCircle size={28} style={{ color: "var(--green)" }} />
                ) : (
                  <Clock size={28} style={{ color: "var(--amber)" }} />
                )}
              </div>
              <div style={styles.statLabel}>
                {event.giveaway_executed ? "Complete" : "Pending"}
              </div>
            </div>
          </div>

          {/* Attendee List */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <Users size={18} />
              Attendees ({attendees.length})
            </h3>
            {attendees.length === 0 ? (
              <div style={styles.emptyState}>
                No attendees yet. Share the QR code to get started.
              </div>
            ) : (
              <div style={styles.attendeeList}>
                {attendees.map((attendee, i) => (
                  <div key={attendee.id} style={styles.attendeeRow}>
                    <div style={styles.attendeeNumber}>{i + 1}</div>
                    <div style={styles.attendeeAddress}>
                      {truncAddr(attendee.wallet_address)}
                    </div>
                    <div style={styles.attendeeTime}>
                      <Clock size={12} />
                      {new Date(attendee.checked_in_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Winners */}
          {winners.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                <Trophy size={18} style={{ color: "var(--amber)" }} />
                Winners
              </h3>
              <div style={styles.winnerList}>
                {winners.map((winner, i) => (
                  <div key={winner} style={styles.winnerRow}>
                    <div style={styles.winnerRank}>#{i + 1}</div>
                    <div style={styles.winnerAddress}>{truncAddr(winner)}</div>
                    <Trophy size={16} style={{ color: "var(--amber)" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side Column */}
        <div style={styles.sideColumn}>
          {/* QR Code */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <QrCode size={18} />
              Check-in QR Code
            </h3>
            <div style={styles.qrContainer}>
              {qrDataUrl && (
                <div style={styles.qrCode}>
                  <img src={qrDataUrl} alt="Check-in QR code" />
                </div>
              )}
              <div style={styles.linkBox}>
                <span style={styles.linkText}>{checkInUrl}</span>
                <button style={styles.iconButton} onClick={handleCopyLink}>
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
                <a
                  href={checkInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.iconButton}
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Run Giveaway */}
          {!event.giveaway_executed && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                <Trophy size={18} />
                Run Giveaway
              </h3>

              {attendees.length === 0 ? (
                <div style={styles.warning}>
                  <AlertCircle size={16} style={styles.warningIcon} />
                  <span style={styles.warningText}>
                    No attendees have checked in yet. Wait for attendees before running the giveaway.
                  </span>
                </div>
              ) : (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Number of Winners</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={winnerCount}
                      onChange={(e) => setWinnerCount(e.target.value)}
                      min="1"
                      max={attendees.length}
                    />
                  </div>

                  {parseInt(winnerCount, 10) > attendees.length && (
                    <div style={styles.warning}>
                      <AlertCircle size={16} style={styles.warningIcon} />
                      <span style={styles.warningText}>
                        Winner count cannot exceed attendee count ({attendees.length})
                      </span>
                    </div>
                  )}

                  <button
                    style={{
                      ...styles.buttonPrimary,
                      ...(drawing || attendees.length === 0 || parseInt(winnerCount, 10) > attendees.length
                        ? styles.buttonDisabled
                        : {}),
                    }}
                    onClick={handleRunGiveaway}
                    disabled={drawing || attendees.length === 0 || parseInt(winnerCount, 10) > attendees.length}
                  >
                    {drawing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Drawing...
                      </>
                    ) : (
                      <>
                        <Trophy size={18} />
                        Run Giveaway
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* BaseScan Link */}
          {event.tx_hash && (
            <a
              href={`https://sepolia.basescan.org/tx/${event.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...styles.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              <ExternalLink size={16} />
              View on BaseScan
            </a>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
