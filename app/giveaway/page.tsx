// ─────────────────────────────────────────────────────────────
//  app/giveaway/page.tsx — Organizer Dashboard
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Calendar,
  Users,
  Trophy,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  apiGetEventsByOrganizer,
  apiCreateEvent,
  apiGetEventSummary,
  type ApiEvent,
  type ApiEventSummary,
} from "@/lib/api";
import {
  createPublicClient,
  http,
  type Address,
} from "viem";
import { base } from "viem/chains";
import {
  DROP_IN_GIVEAWAY_ADDRESS,
  dropInGiveawayAbi,
} from "@/lib/calls";
import type { CSSProperties, FormEvent } from "react";

// ── Types ─────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  accent?: boolean;
}

interface EventRowProps {
  event: ApiEventSummary;
  onSelect: (event: ApiEventSummary) => void;
}

// ── Viem client for read calls ────────────────────────────────
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "32px",
  },
  statCard: {
    padding: "24px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    backdropFilter: "blur(10px)",
  },
  statCardAccent: {
    background: "var(--amber-glow)",
    border: "1px solid rgba(217, 119, 6, 0.2)",
  },
  statIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
    color: "var(--text-secondary)",
  },
  statIconAccent: {
    background: "rgba(217, 119, 6, 0.2)",
    color: "var(--amber)",
  },
  statLabel: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  statSubtext: {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  section: {
    marginBottom: "32px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  createForm: {
    padding: "24px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formGroupFull: {
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
  },
  input: {
    padding: "12px 14px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  textarea: {
    padding: "12px 14px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
    minHeight: "80px",
    resize: "vertical" as const,
    fontFamily: "inherit",
  },
  buttonPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "var(--gradient-amber)",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "var(--text-inverse)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  buttonSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "transparent",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  eventList: {
    display: "flex",
    flexDirection: "column",
  },
  eventRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-subtle)",
    cursor: "pointer",
    transition: "background var(--transition-fast)",
  },
  eventRowLast: {
    borderBottom: "none",
  },
  eventIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "2px",
  },
  eventMeta: {
    fontSize: "12px",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  eventMetaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  eventStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: "12px",
    fontWeight: 500,
  },
  statusLive: {
    background: "var(--green-glow)",
    color: "var(--green)",
  },
  statusComplete: {
    background: "var(--amber-glow)",
    color: "var(--amber)",
  },
  statusLocked: {
    background: "var(--bg-elevated)",
    color: "var(--text-muted)",
  },
  eventArrow: {
    color: "var(--text-muted)",
  },
  emptyState: {
    padding: "48px 24px",
    textAlign: "center" as const,
  },
  emptyIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "var(--radius-lg)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    color: "var(--text-muted)",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  emptyText: {
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  // Event detail modal/panel styles
  detailPanel: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "480px",
    height: "100vh",
    background: "var(--bg-surface)",
    borderLeft: "1px solid var(--border-subtle)",
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    animation: "slideInRight 0.2s ease",
  },
  detailHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  detailClose: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    cursor: "pointer",
    border: "none",
  },
  detailContent: {
    flex: 1,
    padding: "24px",
    overflowY: "auto" as const,
  },
  detailSection: {
    marginBottom: "24px",
  },
  detailLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "8px",
  },
  detailValue: {
    fontSize: "14px",
    color: "var(--text-primary)",
  },
  detailStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    marginBottom: "24px",
  },
  detailStatCard: {
    padding: "16px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
    textAlign: "center" as const,
  },
  detailStatValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  detailStatLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  linkCard: {
    padding: "16px",
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
  detailFooter: {
    padding: "20px 24px",
    borderTop: "1px solid var(--border-subtle)",
    display: "flex",
    gap: "12px",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 199,
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

// ── Stat Card Component ───────────────────────────────────────
function StatCard({ icon, label, value, subtext, accent }: StatCardProps) {
  return (
    <div style={{ ...styles.statCard, ...(accent ? styles.statCardAccent : {}) }}>
      <div style={{ ...styles.statIcon, ...(accent ? styles.statIconAccent : {}) }}>
        {icon}
      </div>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      {subtext && <div style={styles.statSubtext}>{subtext}</div>}
    </div>
  );
}

// ── Event Row Component ───────────────────────────────────────
function EventRow({ event, onSelect }: EventRowProps) {
  const getStatus = () => {
    if (event.giveaway_executed) {
      return { label: "Complete", style: styles.statusComplete, icon: <Trophy size={12} /> };
    }
    if (event.is_locked) {
      return { label: "Locked", style: styles.statusLocked, icon: <XCircle size={12} /> };
    }
    return { label: "Live", style: styles.statusLive, icon: <CheckCircle size={12} /> };
  };

  const status = getStatus();

  return (
    <div style={styles.eventRow} onClick={() => onSelect(event)}>
      <div style={styles.eventIcon}>
        <Calendar size={20} />
      </div>
      <div style={styles.eventInfo}>
        <div style={styles.eventTitle}>{event.title}</div>
        <div style={styles.eventMeta}>
          <span style={styles.eventMetaItem}>
            <Users size={12} />
            {event.attendee_count} checked in
          </span>
          <span style={styles.eventMetaItem}>
            <Clock size={12} />
            {new Date(event.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div style={{ ...styles.eventStatus, ...status.style }}>
        {status.icon}
        {status.label}
      </div>
      <ChevronRight size={18} style={styles.eventArrow} />
    </div>
  );
}

// ── Main Dashboard Component ──────────────────────────────────
export default function DashboardPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address as Address | undefined;

  // State
  const [events, setEvents] = useState<ApiEventSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ApiEventSummary | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Form state
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formMaxAttendees, setFormMaxAttendees] = useState<string>("");

  // Stats
  const totalEvents = events.length;
  const totalAttendees = events.reduce((sum, e) => sum + e.attendee_count, 0);
  const completedGiveaways = events.filter((e) => e.giveaway_executed).length;
  const liveEvents = events.filter((e) => !e.is_locked && !e.giveaway_executed).length;

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const rawEvents = await apiGetEventsByOrganizer(walletAddress);
      // Fetch full summary for each event
      const summaries = await Promise.all(
        rawEvents.map((e) => apiGetEventSummary(e.chain_event_id).catch(() => null))
      );
      setEvents(summaries.filter((s): s is ApiEventSummary => s !== null));
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Create event
  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !formTitle.trim()) return;

    setCreating(true);
    try {
      // Generate a unique chain event ID
      const chainEventId = Date.now();

      // First create on-chain (this would require a transaction)
      // For now, we'll just create in the database
      // In production, you'd use Privy's sendTransaction

      await apiCreateEvent({
        chainEventId,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        organizer: walletAddress,
        maxAttendees: formMaxAttendees ? parseInt(formMaxAttendees, 10) : undefined,
      });

      // Reset form
      setFormTitle("");
      setFormDescription("");
      setFormMaxAttendees("");

      // Refresh events
      await fetchEvents();
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setCreating(false);
    }
  };

  // Copy check-in link
  const handleCopyLink = () => {
    if (!selectedEvent) return;
    const url = `${window.location.origin}/event/${selectedEvent.chain_event_id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout
      title="Dashboard"
      description="Manage your events and giveaways"
    >
      {/* Stats Grid */}
      <div style={styles.grid}>
        <StatCard
          icon={<Calendar size={20} />}
          label="Total Events"
          value={totalEvents}
          subtext={`${liveEvents} active`}
        />
        <StatCard
          icon={<Users size={20} />}
          label="Total Attendees"
          value={totalAttendees}
          subtext="Across all events"
        />
        <StatCard
          icon={<Trophy size={20} />}
          label="Giveaways Run"
          value={completedGiveaways}
          subtext="Successfully completed"
          accent
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Success Rate"
          value={totalEvents > 0 ? `${Math.round((completedGiveaways / totalEvents) * 100)}%` : "—"}
          subtext="Of events completed"
        />
      </div>

      {/* Create Event Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Create New Event</h2>
        </div>
        <div style={styles.card}>
          <form style={styles.createForm} onSubmit={handleCreateEvent}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Title *</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g. ETH Denver Giveaway"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Max Attendees</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="Unlimited"
                  value={formMaxAttendees}
                  onChange={(e) => setFormMaxAttendees(e.target.value)}
                  min="1"
                />
              </div>
              <div style={{ ...styles.formGroup, ...styles.formGroupFull }}>
                <label style={styles.label}>Description</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Tell attendees about your event..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              style={styles.buttonPrimary}
              disabled={creating || !formTitle.trim()}
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Event
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Events List Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Your Events</h2>
          <button style={styles.buttonSecondary} onClick={fetchEvents}>
            Refresh
          </button>
        </div>
        <div style={styles.card}>
          {loading ? (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
            </div>
          ) : events.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <Calendar size={24} />
              </div>
              <div style={styles.emptyTitle}>No events yet</div>
              <div style={styles.emptyText}>
                Create your first event to get started
              </div>
            </div>
          ) : (
            <div style={styles.eventList}>
              {events.map((event, index) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onSelect={setSelectedEvent}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Event Detail Panel */}
      {selectedEvent && (
        <>
          <div style={styles.backdrop} onClick={() => setSelectedEvent(null)} />
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>{selectedEvent.title}</h3>
              <button
                style={styles.detailClose}
                onClick={() => setSelectedEvent(null)}
              >
                <XCircle size={18} />
              </button>
            </div>
            <div style={styles.detailContent}>
              <div style={styles.detailStats}>
                <div style={styles.detailStatCard}>
                  <div style={styles.detailStatValue}>
                    {selectedEvent.attendee_count}
                  </div>
                  <div style={styles.detailStatLabel}>Checked In</div>
                </div>
                <div style={styles.detailStatCard}>
                  <div style={styles.detailStatValue}>
                    {selectedEvent.max_attendees ?? "∞"}
                  </div>
                  <div style={styles.detailStatLabel}>Capacity</div>
                </div>
              </div>

              {selectedEvent.description && (
                <div style={styles.detailSection}>
                  <div style={styles.detailLabel}>Description</div>
                  <div style={styles.detailValue}>
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              <div style={styles.detailSection}>
                <div style={styles.detailLabel}>Check-in Link</div>
                <div style={styles.linkCard}>
                  <span style={styles.linkText}>
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/event/${selectedEvent.chain_event_id}`
                      : ""}
                  </span>
                  <button style={styles.iconButton} onClick={handleCopyLink}>
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                  <a
                    href={`/event/${selectedEvent.chain_event_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.iconButton}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {selectedEvent.giveaway_executed && selectedEvent.winners && (
                <div style={styles.detailSection}>
                  <div style={styles.detailLabel}>Winners</div>
                  {selectedEvent.winners.map((winner, i) => (
                    <div key={winner} style={{ ...styles.detailValue, marginBottom: "4px" }}>
                      {i + 1}. {winner.slice(0, 6)}...{winner.slice(-4)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.detailFooter}>
              {!selectedEvent.giveaway_executed && (
                <a
                  href={`/giveaway/event/${selectedEvent.chain_event_id}`}
                  style={{ ...styles.buttonPrimary, textDecoration: "none", flex: 1 }}
                >
                  <Trophy size={16} />
                  Run Giveaway
                </a>
              )}
              {selectedEvent.tx_hash && (
                <a
                  href={`https://basescan.org/tx/${selectedEvent.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.buttonSecondary, textDecoration: "none" }}
                >
                  <ExternalLink size={14} />
                  BaseScan
                </a>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
