// ─────────────────────────────────────────────────────────────
//  app/giveaway/events/page.tsx — Events List
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Calendar,
  Users,
  Trophy,
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  apiGetEventsByOrganizer,
  apiGetEventSummary,
  type ApiEventSummary,
} from "@/lib/api";
import type { Address } from "viem";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────
type StatusFilter = "all" | "live" | "locked" | "complete";

interface EventCardProps {
  event: ApiEventSummary;
  onSelect: (event: ApiEventSummary) => void;
}

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    flex: 1,
    minWidth: "240px",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "12px 14px 12px 42px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    padding: "4px",
  },
  filterButton: {
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    border: "none",
    background: "transparent",
  },
  filterButtonActive: {
    background: "var(--amber-glow)",
    color: "var(--amber)",
  },
  resultsCount: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "20px",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  cardIcon: {
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
  cardTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  cardId: {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontFamily: "monospace",
    marginBottom: "12px",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: "12px",
    borderTop: "1px solid var(--border-subtle)",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  cardMetaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  cardArrow: {
    color: "var(--text-muted)",
  },
  emptyState: {
    padding: "64px 24px",
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
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "64px 0",
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "3px solid var(--border-default)",
    borderTopColor: "var(--amber)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

// ── Helpers ───────────────────────────────────────────────────
function getEventStatus(event: ApiEventSummary) {
  if (event.giveaway_executed) {
    return { label: "Complete", style: styles.statusComplete, icon: <Trophy size={12} /> };
  }
  if (event.is_locked) {
    return { label: "Locked", style: styles.statusLocked, icon: <XCircle size={12} /> };
  }
  return { label: "Live", style: styles.statusLive, icon: <CheckCircle size={12} /> };
}

function getStatusKey(event: ApiEventSummary): StatusFilter {
  if (event.giveaway_executed) return "complete";
  if (event.is_locked) return "locked";
  return "live";
}

// ── Event Card Component ──────────────────────────────────────
function EventCard({ event, onSelect }: EventCardProps) {
  const status = getEventStatus(event);

  return (
    <div style={styles.card} onClick={() => onSelect(event)}>
      <div style={styles.cardHeader}>
        <div style={styles.cardIcon}>
          <Calendar size={20} />
        </div>
        <div style={{ ...styles.eventStatus, ...status.style }}>
          {status.icon}
          {status.label}
        </div>
      </div>
      <div style={styles.cardTitle}>{event.title}</div>
      <div style={styles.cardId}>ID: {event.chain_event_id}</div>
      <div style={styles.cardFooter}>
        <div style={styles.cardMeta}>
          <span style={styles.cardMetaItem}>
            <Users size={12} />
            {event.attendee_count} attendees
          </span>
          <span style={styles.cardMetaItem}>
            <Clock size={12} />
            {new Date(event.created_at).toLocaleDateString()}
          </span>
        </div>
        <ChevronRight size={16} style={styles.cardArrow} />
      </div>
    </div>
  );
}

// ── Main Events Page Component ────────────────────────────────
export default function EventsPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address as Address | undefined;

  // State
  const [events, setEvents] = useState<ApiEventSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const rawEvents = await apiGetEventsByOrganizer(walletAddress);
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

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Status filter
      if (statusFilter !== "all" && getStatusKey(event) !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          event.title.toLowerCase().includes(query) ||
          String(event.chain_event_id).includes(query)
        );
      }
      return true;
    });
  }, [events, searchQuery, statusFilter]);

  // Navigate to event detail
  const handleSelectEvent = (event: ApiEventSummary) => {
    router.push(`/giveaway/event/${event.chain_event_id}`);
  };

  const filterButtons: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "locked", label: "Locked" },
    { key: "complete", label: "Complete" },
  ];

  return (
    <DashboardLayout
      title="Events"
      description="Browse and manage all your events"
    >
      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon as CSSProperties} />
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search by title or event ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={styles.filterGroup}>
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              style={{
                ...styles.filterButton,
                ...(statusFilter === btn.key ? styles.filterButtonActive : {}),
              }}
              onClick={() => setStatusFilter(btn.key)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div style={styles.resultsCount}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          {statusFilter !== "all" && ` · ${statusFilter}`}
          {searchQuery.trim() && ` · "${searchQuery}"`}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            {searchQuery.trim() || statusFilter !== "all" ? (
              <Search size={24} />
            ) : (
              <Calendar size={24} />
            )}
          </div>
          <div style={styles.emptyTitle}>
            {searchQuery.trim() || statusFilter !== "all"
              ? "No events match your filters"
              : "No events yet"}
          </div>
          <div style={styles.emptyText}>
            {searchQuery.trim() || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Create your first event from the dashboard"}
          </div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={handleSelectEvent}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
