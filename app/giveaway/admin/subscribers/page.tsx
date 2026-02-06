// ─────────────────────────────────────────────────────────────
//  app/giveaway/admin/subscribers/page.tsx — Email Subscribers Admin
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Mail,
  Download,
  Loader2,
  RefreshCw,
  Users,
  Calendar,
  Wallet,
  Tag,
  AlertTriangle,
} from "lucide-react";
import type { CSSProperties } from "react";

// Admin wallets that can access this page
const ADMIN_WALLETS = [
  "0xAA49d591b259324671792C8f972486403895Ff9b", // Dan
].map(w => w.toLowerCase());

interface Subscriber {
  id: string;
  email: string;
  source: string;
  wallet: string | null;
  created_at: string;
}

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap" as const,
    gap: "16px",
  },
  stats: {
    display: "flex",
    gap: "24px",
  },
  stat: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
  },
  statIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-md)",
    background: "var(--amber-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--amber)",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  statLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  actions: {
    display: "flex",
    gap: "12px",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  buttonPrimary: {
    background: "var(--gradient-amber)",
    border: "none",
    color: "var(--text-inverse)",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  tableContainer: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "14px 16px",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    background: "var(--bg-elevated)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  td: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "var(--text-primary)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  tdMono: {
    fontFamily: "monospace",
    fontSize: "13px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "var(--radius-full)",
    fontSize: "12px",
    fontWeight: 500,
  },
  badgeLanding: {
    background: "var(--amber-glow)",
    color: "var(--amber)",
  },
  badgeCheckin: {
    background: "var(--green-glow)",
    color: "var(--green)",
  },
  badgeOther: {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
  },
  emptyState: {
    padding: "60px 20px",
    textAlign: "center" as const,
  },
  emptyIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "var(--radius-lg)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    color: "var(--text-muted)",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  emptyText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  unauthorized: {
    padding: "80px 20px",
    textAlign: "center" as const,
  },
  unauthorizedIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-lg)",
    background: "var(--red-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "var(--red)",
  },
  unauthorizedTitle: {
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "8px",
  },
  unauthorizedText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
};

// ── Helper Functions ──────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSourceBadgeStyle(source: string): CSSProperties {
  switch (source) {
    case "landing":
      return styles.badgeLanding;
    case "post-checkin":
      return styles.badgeCheckin;
    default:
      return styles.badgeOther;
  }
}

function truncateWallet(wallet: string | null): string {
  if (!wallet) return "—";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

// ── Main Component ────────────────────────────────────────────
export default function SubscribersPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isAdmin = walletAddress && ADMIN_WALLETS.includes(walletAddress.toLowerCase());

  // Fetch subscribers
  const fetchSubscribers = useCallback(async () => {
    if (!walletAddress || !isAdmin) return;

    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        headers: { "x-wallet-address": walletAddress },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
      }
    } catch (err) {
      console.error("Failed to fetch subscribers:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, isAdmin]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Export CSV
  const handleExport = async () => {
    if (!walletAddress || !isAdmin) return;

    setExporting(true);
    try {
      const res = await fetch("/api/subscribe?format=csv", {
        headers: { "x-wallet-address": walletAddress },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dropin-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error("Failed to export:", err);
    } finally {
      setExporting(false);
    }
  };

  // Unauthorized state
  if (!isAdmin) {
    return (
      <DashboardLayout
        title="Email Subscribers"
        description="Admin access required"
      >
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

  return (
    <DashboardLayout
      title="Email Subscribers"
      description="Manage newsletter subscribers"
    >
      {/* Header with stats and actions */}
      <div style={styles.header}>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statIcon}>
              <Users size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{subscribers.length}</div>
              <div style={styles.statLabel}>Total Subscribers</div>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onClick={fetchSubscribers}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              ...(exporting ? styles.buttonDisabled : {}),
            }}
            onClick={handleExport}
            disabled={exporting || subscribers.length === 0}
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.emptyState}>
            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto", color: "var(--text-muted)" }} />
            <p style={{ ...styles.emptyText, marginTop: "16px" }}>Loading subscribers...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <Mail size={28} />
            </div>
            <div style={styles.emptyTitle}>No subscribers yet</div>
            <div style={styles.emptyText}>
              Email signups will appear here
            </div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Wallet</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.id}>
                  <td style={styles.td}>{sub.email}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...getSourceBadgeStyle(sub.source) }}>
                      <Tag size={12} />
                      {sub.source}
                    </span>
                  </td>
                  <td style={{ ...styles.td, ...styles.tdMono }}>
                    {truncateWallet(sub.wallet)}
                  </td>
                  <td style={styles.td}>{formatDate(sub.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
