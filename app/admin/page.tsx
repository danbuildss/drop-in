// ─────────────────────────────────────────────────────────────
//  app/admin/page.tsx — Platform-wide Admin Analytics Dashboard
//
//  Hidden admin page accessible only to configured admin wallets.
//  Access via URL: /admin
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Calendar,
  Users,
  Wallet,
  Mail,
  TrendingUp,
  TrendingDown,
  Trophy,
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type { CSSProperties } from "react";

// Admin wallets from env (comma-separated)
const ADMIN_WALLETS = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || "")
  .split(",")
  .map(w => w.trim().toLowerCase())
  .filter(Boolean);

// ── Types ─────────────────────────────────────────────────────
interface AdminStats {
  overview: {
    totalEvents: number;
    totalCheckIns: number;
    uniqueWallets: number;
    emailSubscribers: number;
  };
  growth: {
    eventsThisWeek: number;
    eventsLastWeek: number;
    checkInsThisWeek: number;
    checkInsLastWeek: number;
  };
  topEvents: Array<{
    id: string;
    title: string;
    organizer: string;
    checkInCount: number;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    wallet: string;
    eventTitle: string;
    timestamp: string;
  }>;
  emailsBySource: Record<string, number>;
}

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    padding: "20px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
  },
  statHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  statIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
  },
  statIconAccent: {
    background: "var(--amber-glow)",
    color: "var(--amber)",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "13px",
    color: "var(--text-muted)",
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
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  growthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  growthCard: {
    padding: "20px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
  },
  growthLabel: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginBottom: "8px",
  },
  growthRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  growthValues: {
    flex: 1,
  },
  growthCurrent: {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  growthCompare: {
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  growthBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: "12px",
    fontWeight: 500,
  },
  growthUp: {
    background: "var(--green-glow)",
    color: "var(--green)",
  },
  growthDown: {
    background: "var(--red-glow)",
    color: "var(--red)",
  },
  growthNeutral: {
    background: "var(--bg-elevated)",
    color: "var(--text-muted)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "12px 16px",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    background: "var(--bg-elevated)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  td: {
    padding: "12px 16px",
    fontSize: "14px",
    color: "var(--text-primary)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  tdMono: {
    fontFamily: "monospace",
    fontSize: "13px",
  },
  activityList: {
    padding: "0",
    margin: "0",
    listStyle: "none",
  },
  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  activityIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityText: {
    fontSize: "14px",
    color: "var(--text-primary)",
  },
  activityWallet: {
    fontFamily: "monospace",
    fontSize: "13px",
    color: "var(--amber)",
  },
  activityTime: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  emailSourcesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    padding: "16px",
  },
  emailSourceCard: {
    padding: "16px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
    textAlign: "center" as const,
  },
  emailSourceValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  emailSourceLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginTop: "4px",
    textTransform: "capitalize" as const,
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center" as const,
    color: "var(--text-muted)",
  },
  unauthorized: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    textAlign: "center" as const,
    padding: "40px",
  },
  unauthorizedIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-lg)",
    background: "var(--red-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    color: "var(--red)",
  },
  unauthorizedTitle: {
    fontSize: "24px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "8px",
  },
  unauthorizedText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
};

// ── Helpers ───────────────────────────────────────────────────
function truncateWallet(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateGrowth(current: number, previous: number): { percent: number; isUp: boolean; isNeutral: boolean } {
  if (previous === 0) {
    return { percent: current > 0 ? 100 : 0, isUp: current > 0, isNeutral: current === 0 };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  return { percent: Math.abs(percent), isUp: percent >= 0, isNeutral: percent === 0 };
}

// ── Main Component ────────────────────────────────────────────
export default function AdminDashboard() {
  const { address, isConnecting } = useAccount();
  const walletAddress = address;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = walletAddress && ADMIN_WALLETS.includes(walletAddress.toLowerCase());

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!walletAddress || !isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-wallet-address": walletAddress },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, isAdmin]);

  useEffect(() => {
    if (!isConnecting && isAdmin) {
      fetchStats();
    } else if (!isConnecting && !isAdmin) {
      setLoading(false);
    }
  }, [isConnecting, isAdmin, fetchStats]);

  // Unauthorized state
  if (!isConnecting && !isAdmin) {
    return (
      <DashboardLayout title="Admin Dashboard" description="Platform analytics">
        <div style={styles.unauthorized}>
          <div style={styles.unauthorizedIcon}>
            <AlertTriangle size={32} />
          </div>
          <div style={styles.unauthorizedTitle}>Access Denied</div>
          <div style={styles.unauthorizedText}>
            You don&apos;t have permission to view this page.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state
  if (isConnecting || loading) {
    return (
      <DashboardLayout title="Admin Dashboard" description="Platform analytics">
        <div style={styles.loadingContainer}>
          <Loader2 size={40} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout title="Admin Dashboard" description="Platform analytics">
        <div style={styles.unauthorized}>
          <div style={{ ...styles.unauthorizedIcon, background: "var(--amber-glow)", color: "var(--amber)" }}>
            <AlertTriangle size={32} />
          </div>
          <div style={styles.unauthorizedTitle}>Error Loading Data</div>
          <div style={styles.unauthorizedText}>{error}</div>
          <button style={{ ...styles.button, marginTop: "20px" }} onClick={fetchStats}>
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const eventsGrowth = stats ? calculateGrowth(stats.growth.eventsThisWeek, stats.growth.eventsLastWeek) : null;
  const checkInsGrowth = stats ? calculateGrowth(stats.growth.checkInsThisWeek, stats.growth.checkInsLastWeek) : null;

  return (
    <DashboardLayout title="Admin Dashboard" description="Platform-wide analytics">
      {/* Overview Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <div style={{ ...styles.statIcon, ...styles.statIconAccent }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={styles.statValue}>{stats?.overview.totalEvents || 0}</div>
          <div style={styles.statLabel}>Total Events</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <div style={styles.statIcon}>
              <Users size={20} />
            </div>
          </div>
          <div style={styles.statValue}>{stats?.overview.totalCheckIns || 0}</div>
          <div style={styles.statLabel}>Total Check-ins</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <div style={styles.statIcon}>
              <Wallet size={20} />
            </div>
          </div>
          <div style={styles.statValue}>{stats?.overview.uniqueWallets || 0}</div>
          <div style={styles.statLabel}>Unique Wallets</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <div style={styles.statIcon}>
              <Mail size={20} />
            </div>
          </div>
          <div style={styles.statValue}>{stats?.overview.emailSubscribers || 0}</div>
          <div style={styles.statLabel}>Email Subscribers</div>
        </div>
      </div>

      {/* Growth Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            <TrendingUp size={18} />
            Weekly Growth
          </h2>
          <button style={styles.button} onClick={fetchStats}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div style={styles.growthGrid}>
          <div style={styles.growthCard}>
            <div style={styles.growthLabel}>Events This Week vs Last Week</div>
            <div style={styles.growthRow}>
              <div style={styles.growthValues}>
                <div style={styles.growthCurrent}>{stats?.growth.eventsThisWeek || 0}</div>
                <div style={styles.growthCompare}>vs {stats?.growth.eventsLastWeek || 0} last week</div>
              </div>
              {eventsGrowth && (
                <div style={{
                  ...styles.growthBadge,
                  ...(eventsGrowth.isNeutral ? styles.growthNeutral : eventsGrowth.isUp ? styles.growthUp : styles.growthDown),
                }}>
                  {eventsGrowth.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {eventsGrowth.percent}%
                </div>
              )}
            </div>
          </div>

          <div style={styles.growthCard}>
            <div style={styles.growthLabel}>Check-ins This Week vs Last Week</div>
            <div style={styles.growthRow}>
              <div style={styles.growthValues}>
                <div style={styles.growthCurrent}>{stats?.growth.checkInsThisWeek || 0}</div>
                <div style={styles.growthCompare}>vs {stats?.growth.checkInsLastWeek || 0} last week</div>
              </div>
              {checkInsGrowth && (
                <div style={{
                  ...styles.growthBadge,
                  ...(checkInsGrowth.isNeutral ? styles.growthNeutral : checkInsGrowth.isUp ? styles.growthUp : styles.growthDown),
                }}>
                  {checkInsGrowth.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {checkInsGrowth.percent}%
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Top Events Table */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            <Trophy size={18} />
            Top Events
          </h2>
        </div>

        <div style={styles.card}>
          {stats?.topEvents && stats.topEvents.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Event</th>
                    <th style={styles.th}>Organizer</th>
                    <th style={styles.th}>Check-ins</th>
                    <th style={styles.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topEvents.map((event, index) => (
                    <tr key={event.id}>
                      <td style={styles.td}>
                        <span style={{ fontWeight: 500 }}>{event.title}</span>
                      </td>
                      <td style={{ ...styles.td, ...styles.tdMono }}>
                        {truncateWallet(event.organizer)}
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: 600, color: "var(--amber)" }}>
                          {event.checkInCount}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(event.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.emptyState}>No events yet</div>
          )}
        </div>
      </section>

      {/* Recent Activity & Email Sources side by side on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {/* Recent Activity Feed */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              <Activity size={18} />
              Recent Activity
            </h2>
          </div>

          <div style={styles.card}>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <ul style={styles.activityList}>
                {stats.recentActivity.map((activity) => (
                  <li key={activity.id} style={styles.activityItem}>
                    <div style={styles.activityIcon}>
                      <Users size={14} />
                    </div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityText}>
                        <span style={styles.activityWallet}>{truncateWallet(activity.wallet)}</span>
                        {" checked into "}
                        <span style={{ fontWeight: 500 }}>{activity.eventTitle}</span>
                      </div>
                      <div style={styles.activityTime}>
                        <Clock size={10} style={{ display: "inline", marginRight: "4px" }} />
                        {formatTime(activity.timestamp)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={styles.emptyState}>No recent activity</div>
            )}
          </div>
        </section>

        {/* Email Subscribers by Source */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              <Mail size={18} />
              Email Subscribers by Source
            </h2>
          </div>

          <div style={styles.card}>
            {stats?.emailsBySource && Object.keys(stats.emailsBySource).length > 0 ? (
              <div style={styles.emailSourcesGrid}>
                {Object.entries(stats.emailsBySource).map(([source, count]) => (
                  <div key={source} style={styles.emailSourceCard}>
                    <div style={styles.emailSourceValue}>{count}</div>
                    <div style={styles.emailSourceLabel}>{source.replace("-", " ")}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>No subscribers yet</div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
