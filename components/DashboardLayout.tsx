// ─────────────────────────────────────────────────────────────
//  components/DashboardLayout.tsx — Layout wrapper for dashboard
// ─────────────────────────────────────────────────────────────

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Sidebar } from "./Sidebar";
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
    marginLeft: "var(--sidebar-width)",
    minHeight: "100vh",
  },
  header: {
    padding: "24px 32px",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--bg-base)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  headerInner: {
    maxWidth: "1400px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  description: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  content: {
    padding: "32px",
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
    borderTopColor: "var(--amber)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

export function DashboardLayout({ 
  children, 
  title, 
  description 
}: DashboardLayoutProps) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        {(title || description) && (
          <header style={styles.header}>
            <div style={styles.headerInner}>
              {title && <h1 style={styles.title}>{title}</h1>}
              {description && <p style={styles.description}>{description}</p>}
            </div>
          </header>
        )}
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}
