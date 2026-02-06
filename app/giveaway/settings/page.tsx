// ─────────────────────────────────────────────────────────────
//  app/giveaway/settings/page.tsx — Settings
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy, useUpdateAccount } from "@privy-io/react-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  User,
  Wallet,
  Copy,
  CheckCircle,
  Mail,
  Bell,
  BellOff,
  Hash,
  Shield,
  AlertTriangle,
  Trophy,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import type { CSSProperties } from "react";

// ── Constants ─────────────────────────────────────────────────
const LS_KEY_WINNER_COUNT = "dropin_default_winner_count";
const LS_KEY_NOTIFY_GIVEAWAY = "dropin_notify_giveaway";
const LS_KEY_NOTIFY_CHECKIN = "dropin_notify_checkin";

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: "32px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  sectionIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  sectionDescription: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  cardRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  cardRowLast: {
    borderBottom: "none",
  },
  rowIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginBottom: "2px",
  },
  rowValue: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    fontFamily: "monospace",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  rowValueNormal: {
    fontFamily: "inherit",
  },
  iconButton: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    flexShrink: 0,
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "2px",
  },
  toggleDescription: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  toggle: {
    width: "44px",
    height: "24px",
    borderRadius: "var(--radius-full)",
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "background var(--transition-fast)",
    flexShrink: 0,
  },
  toggleOff: {
    background: "var(--bg-elevated)",
  },
  toggleOn: {
    background: "var(--amber)",
  },
  toggleKnob: {
    position: "absolute",
    top: "2px",
    width: "20px",
    height: "20px",
    borderRadius: "var(--radius-full)",
    background: "white",
    transition: "left var(--transition-fast)",
  },
  toggleKnobOff: {
    left: "2px",
  },
  toggleKnobOn: {
    left: "22px",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  inputSmall: {
    width: "80px",
    padding: "10px 12px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
    textAlign: "center" as const,
    flexShrink: 0,
  },
  dangerCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--red-glow)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  dangerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  dangerIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-md)",
    background: "var(--red-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--red)",
  },
  dangerTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--red)",
  },
  dangerRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
  },
  dangerInfo: {
    flex: 1,
  },
  dangerLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "2px",
  },
  dangerDescription: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  buttonDanger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 18px",
    background: "var(--red-glow)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "var(--radius-md)",
    color: "var(--red)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    flexShrink: 0,
  },
  emptyValue: {
    fontSize: "14px",
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  linkButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    background: "var(--amber-glow)",
    border: "1px solid rgba(59, 125, 221, 0.3)",
    borderRadius: "var(--radius-md)",
    color: "var(--amber)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    flexShrink: 0,
  },
  unlinkButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-muted)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    flexShrink: 0,
  },
};

// ── Toggle Component ──────────────────────────────────────────
function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      style={{
        ...styles.toggle,
        ...(enabled ? styles.toggleOn : styles.toggleOff),
      }}
      onClick={onToggle}
      type="button"
      aria-label="Toggle"
    >
      <div
        style={{
          ...styles.toggleKnob,
          ...(enabled ? styles.toggleKnobOn : styles.toggleKnobOff),
        }}
      />
    </button>
  );
}

// ── Main Settings Component ───────────────────────────────────
export default function SettingsPage() {
  const { user, logout, linkEmail, unlinkEmail } = usePrivy();
  const walletAddress = user?.wallet?.address ?? "";
  const emailAddress = user?.email?.address ?? "";

  // State
  const [copied, setCopied] = useState<boolean>(false);
  const [defaultWinnerCount, setDefaultWinnerCount] = useState<string>("1");
  const [notifyGiveaway, setNotifyGiveaway] = useState<boolean>(true);
  const [notifyCheckin, setNotifyCheckin] = useState<boolean>(false);
  const [linkingEmail, setLinkingEmail] = useState<boolean>(false);
  const [unlinkingEmail, setUnlinkingEmail] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedWinnerCount = localStorage.getItem(LS_KEY_WINNER_COUNT);
    if (savedWinnerCount) setDefaultWinnerCount(savedWinnerCount);

    const savedNotifyGiveaway = localStorage.getItem(LS_KEY_NOTIFY_GIVEAWAY);
    if (savedNotifyGiveaway !== null) setNotifyGiveaway(savedNotifyGiveaway === "true");

    const savedNotifyCheckin = localStorage.getItem(LS_KEY_NOTIFY_CHECKIN);
    if (savedNotifyCheckin !== null) setNotifyCheckin(savedNotifyCheckin === "true");
  }, []);

  // Save preferences
  const saveWinnerCount = useCallback((val: string) => {
    setDefaultWinnerCount(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_WINNER_COUNT, val);
    }
  }, []);

  const toggleNotifyGiveaway = useCallback(() => {
    setNotifyGiveaway((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEY_NOTIFY_GIVEAWAY, String(next));
      }
      return next;
    });
  }, []);

  const toggleNotifyCheckin = useCallback(() => {
    setNotifyCheckin((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEY_NOTIFY_CHECKIN, String(next));
      }
      return next;
    });
  }, []);

  // Copy wallet address
  const handleCopyWallet = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Link email
  const handleLinkEmail = async () => {
    setLinkingEmail(true);
    try {
      await linkEmail();
    } catch (err) {
      console.error("Failed to link email:", err);
    } finally {
      setLinkingEmail(false);
    }
  };

  // Unlink email
  const handleUnlinkEmail = async () => {
    if (!user?.email?.address) return;
    setUnlinkingEmail(true);
    try {
      await unlinkEmail(user.email.address);
    } catch (err) {
      console.error("Failed to unlink email:", err);
    } finally {
      setUnlinkingEmail(false);
    }
  };

  // Delete account
  const handleDeleteAccount = () => {
    // Sign out and clear local data - in production, you'd call a delete API
    logout();
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Manage your profile and preferences"
    >
      {/* Profile Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionIcon}>
            <User size={18} />
          </div>
          <div>
            <div style={styles.sectionTitle}>Profile</div>
            <div style={styles.sectionDescription}>
              Your connected account details
            </div>
          </div>
        </div>
        <div style={styles.card}>
          {/* Wallet Address */}
          <div style={styles.cardRow}>
            <div style={styles.rowIcon}>
              <Wallet size={16} />
            </div>
            <div style={styles.rowInfo}>
              <div style={styles.rowLabel}>Wallet Address</div>
              {walletAddress ? (
                <div style={styles.rowValue}>{walletAddress}</div>
              ) : (
                <div style={styles.emptyValue}>No wallet connected</div>
              )}
            </div>
            {walletAddress && (
              <button style={styles.iconButton} onClick={handleCopyWallet}>
                {copied ? (
                  <CheckCircle size={16} style={{ color: "var(--green)" }} />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            )}
          </div>

          {/* Email */}
          <div style={{ ...styles.cardRow, ...styles.cardRowLast }}>
            <div style={styles.rowIcon}>
              <Mail size={16} />
            </div>
            <div style={styles.rowInfo}>
              <div style={styles.rowLabel}>Email</div>
              {emailAddress ? (
                <div style={{ ...styles.rowValue, ...styles.rowValueNormal }}>
                  {emailAddress}
                </div>
              ) : (
                <div style={styles.emptyValue}>No email linked</div>
              )}
            </div>
            {emailAddress ? (
              <button
                style={styles.unlinkButton}
                onClick={handleUnlinkEmail}
                disabled={unlinkingEmail}
              >
                {unlinkingEmail ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Unlink
              </button>
            ) : (
              <button
                style={styles.linkButton}
                onClick={handleLinkEmail}
                disabled={linkingEmail}
              >
                {linkingEmail ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Link Email
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Preferences Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionIcon}>
            <Hash size={18} />
          </div>
          <div>
            <div style={styles.sectionTitle}>Preferences</div>
            <div style={styles.sectionDescription}>
              Customize your giveaway defaults
            </div>
          </div>
        </div>
        <div style={styles.card}>
          {/* Default Winner Count */}
          <div style={styles.inputRow}>
            <div style={styles.rowIcon}>
              <Trophy size={16} style={{ color: "var(--amber)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.toggleLabel}>Default Winner Count</div>
              <div style={styles.toggleDescription}>
                Pre-fill the winner count when running giveaways
              </div>
            </div>
            <input
              type="number"
              style={styles.inputSmall}
              value={defaultWinnerCount}
              onChange={(e) => saveWinnerCount(e.target.value)}
              min="1"
              max="100"
            />
          </div>

          {/* Notification: Giveaway Complete */}
          <div style={styles.toggleRow}>
            <div style={styles.rowIcon}>
              <Bell size={16} />
            </div>
            <div style={styles.toggleInfo}>
              <div style={styles.toggleLabel}>Giveaway Notifications</div>
              <div style={styles.toggleDescription}>
                Get notified when a giveaway completes
              </div>
            </div>
            <Toggle enabled={notifyGiveaway} onToggle={toggleNotifyGiveaway} />
          </div>

          {/* Notification: Check-in */}
          <div style={{ ...styles.toggleRow, borderBottom: "none" }}>
            <div style={styles.rowIcon}>
              <BellOff size={16} />
            </div>
            <div style={styles.toggleInfo}>
              <div style={styles.toggleLabel}>Check-in Alerts</div>
              <div style={styles.toggleDescription}>
                Get notified when attendees check in to your events
              </div>
            </div>
            <Toggle enabled={notifyCheckin} onToggle={toggleNotifyCheckin} />
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section style={styles.section}>
        <div style={styles.dangerHeader}>
          <div style={styles.dangerIcon}>
            <AlertTriangle size={18} />
          </div>
          <div style={styles.dangerTitle}>Danger Zone</div>
        </div>
        <div style={styles.dangerCard}>
          <div style={styles.dangerRow}>
            <div style={styles.dangerInfo}>
              <div style={styles.dangerLabel}>Delete Account</div>
              <div style={styles.dangerDescription}>
                Permanently delete your account and all associated data. This cannot be undone.
              </div>
            </div>
            {!showDeleteConfirm ? (
              <button style={styles.buttonDanger} onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} />
                Delete Account
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={{
                    ...styles.buttonDanger,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.buttonDanger,
                    background: "var(--red)",
                    color: "white",
                  }}
                  onClick={handleDeleteAccount}
                >
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
