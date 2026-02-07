// ─────────────────────────────────────────────────────────────
//  components/Sidebar.tsx — Dashboard sidebar navigation
// ─────────────────────────────────────────────────────────────

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  User,
  X,
  Mail,
  Shield,
} from "lucide-react";

// Admin wallets from env (comma-separated)
const ADMIN_WALLETS = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || "")
  .split(",")
  .map(w => w.trim().toLowerCase())
  .filter(Boolean);
import type { CSSProperties, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────
interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  isActive: boolean;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  showClose?: boolean;
}

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  sidebar: {
    position: "relative",
    top: 0,
    left: 0,
    height: "100vh",
    width: "260px",
    background: "var(--bg-surface)",
    borderRight: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
    transition: "width var(--transition-base)",
  },
  sidebarCollapsed: {
    width: "var(--sidebar-collapsed)",
  },
  header: {
    padding: "20px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "var(--gradient-amber)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
  },
  logoText: {
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  toggleButton: {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  nav: {
    flex: 1,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none",
    transition: "all var(--transition-fast)",
    cursor: "pointer",
  },
  navItemActive: {
    background: "var(--amber-glow)",
    color: "var(--amber)",
  },
  navItemHover: {
    background: "var(--bg-elevated)",
  },
  navIcon: {
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
  navLabel: {
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  footer: {
    padding: "16px 12px",
    borderTop: "1px solid var(--border-subtle)",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    marginBottom: "8px",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--radius-full)",
    background: "var(--amber-glow)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--amber)",
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userAddress: {
    fontSize: "11px",
    color: "var(--text-muted)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    color: "var(--text-muted)",
    fontSize: "14px",
    fontWeight: 500,
    width: "100%",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
};

// ── Nav Item Component ────────────────────────────────────────
function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      style={{
        ...styles.navItem,
        ...(isActive ? styles.navItemActive : {}),
      }}
    >
      <span style={styles.navIcon}>{icon}</span>
      <span style={styles.navLabel}>{label}</span>
    </Link>
  );
}

// ── Main Sidebar Component ────────────────────────────────────
export function Sidebar({ collapsed = false, onToggle, onClose, showClose }: SidebarProps) {
  const pathname = usePathname();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const walletAddress = address;
  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";
  const displayName = displayAddress || "User";

  const isAdmin = walletAddress && ADMIN_WALLETS.includes(walletAddress.toLowerCase());

  const navItems: Array<{ href: string; icon: ReactNode; label: string }> = [
    { href: "/giveaway", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { href: "/giveaway/events", icon: <Calendar size={20} />, label: "Events" },
    { href: "/giveaway/settings", icon: <Settings size={20} />, label: "Settings" },
    ...(isAdmin ? [
      { href: "/admin", icon: <Shield size={20} />, label: "Admin" },
      { href: "/giveaway/admin/subscribers", icon: <Mail size={20} />, label: "Subscribers" },
    ] : []),
  ];

  const handleLogout = () => {
    disconnect();
  };

  return (
    <aside
      style={{
        ...styles.sidebar,
        ...(collapsed ? styles.sidebarCollapsed : {}),
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <img src="/logo-icon.png" alt="DropIn" style={{ width: "36px", height: "36px", borderRadius: "10px" }} />
          {!collapsed && <span style={styles.logoText}>DropIn</span>}
        </div>
        {showClose && onClose && (
          <button
            style={{
              ...styles.toggleButton,
            }}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
        {!showClose && onToggle && (
          <button
            style={{
              ...styles.toggleButton,
              transform: collapsed ? "rotate(180deg)" : "none",
            }}
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={collapsed ? "" : item.label}
            isActive={pathname === item.href || pathname?.startsWith(`${item.href}/`)}
          />
        ))}
      </nav>

      {/* Footer with user info */}
      <div style={styles.footer}>
        {!collapsed && (
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              <User size={16} />
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{displayName}</div>
              {walletAddress && displayName !== displayAddress && (
                <div style={styles.userAddress}>{displayAddress}</div>
              )}
            </div>
          </div>
        )}
        <button style={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={20} />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
