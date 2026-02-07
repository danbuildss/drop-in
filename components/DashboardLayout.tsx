// ─────────────────────────────────────────────────────────────
//  components/DashboardLayout.tsx — Layout wrapper for dashboard
// ─────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Sidebar } from "./Sidebar";
import { Menu, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "var(--bg-base)",
  },
  main: {
    minHeight: "100vh",
    transition: "margin-left 0.2s ease",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--bg-base)",
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  menuButton: {
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "2px",
  },
  description: {
    fontSize: "13px",
    color: "var(--text-secondary)",
  },
  content: {
    padding: "24px 20px",
    maxWidth: "1400px",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "var(--bg-base)",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--border-default)",
    borderTopColor: "var(--blue-primary)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  mobileOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 99,
    opacity: 0,
    visibility: "hidden",
    transition: "opacity 0.2s ease, visibility 0.2s ease",
  },
  mobileOverlayActive: {
    opacity: 1,
    visibility: "visible",
  },
};

export function DashboardLayout({ 
  children, 
  title, 
  description 
}: DashboardLayoutProps) {
  const router = useRouter();
  const { isConnected, isConnecting } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [title]);

  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.push("/");
    }
  }, [isConnecting, isConnected, router]);

  if (isConnecting) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Mobile overlay */}
      <div 
        style={{
          ...styles.mobileOverlay,
          ...(mobileMenuOpen ? styles.mobileOverlayActive : {}),
        }}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      {/* Sidebar - shown on desktop, slides in on mobile */}
      <div style={{
        position: isMobile ? "fixed" : "fixed",
        left: isMobile ? (mobileMenuOpen ? 0 : "-280px") : 0,
        top: 0,
        height: "100vh",
        zIndex: 100,
        transition: "left 0.2s ease",
      }}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} showClose={isMobile && mobileMenuOpen} />
      </div>
      
      <main style={{
        ...styles.main,
        marginLeft: isMobile ? 0 : "var(--sidebar-width)",
      }}>
        {/* Header */}
        <header style={styles.header}>
          <button 
            style={{
              ...styles.menuButton,
              display: isMobile ? "flex" : "none",
            }}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div style={styles.headerContent}>
            {title && <h1 style={styles.title}>{title}</h1>}
            {description && <p style={styles.description}>{description}</p>}
          </div>
        </header>
        
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}
