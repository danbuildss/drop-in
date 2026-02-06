// ─────────────────────────────────────────────────────────────
//  app/page.tsx — Landing page
// ─────────────────────────────────────────────────────────────

"use client";

import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useRef, useEffect } from "react";
import { 
  Calendar, 
  QrCode, 
  Trophy, 
  ArrowRight, 
  Shield, 
  Zap, 
  Users,
  ChevronRight 
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────
interface StepCardProps {
  number: number;
  icon: ReactNode;
  title: string;
  description: string;
  delay: number;
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-base)",
    position: "relative",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: "-20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "120%",
    height: "600px",
    background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59, 125, 221, 0.12), transparent 70%)",
    pointerEvents: "none",
  },
  nav: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px clamp(16px, 4vw, 40px)",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  logoIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "var(--gradient-amber)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "32px",
  },
  navLink: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    transition: "color var(--transition-fast)",
    cursor: "pointer",
  },
  navButton: {
    padding: "10px 20px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  hero: {
    position: "relative",
    zIndex: 1,
    textAlign: "center" as const,
    padding: "80px 40px 60px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "var(--amber-glow)",
    border: "1px solid rgba(0, 82, 255, 0.3)",
    borderRadius: "var(--radius-full)",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--amber-400)",
    marginBottom: "24px",
  },
  headline: {
    fontSize: "clamp(36px, 5vw, 56px)",
    fontWeight: 700,
    lineHeight: 1.1,
    color: "var(--text-primary)",
    marginBottom: "20px",
    letterSpacing: "-0.02em",
  },
  headlineAccent: {
    background: "var(--gradient-amber)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: "18px",
    color: "var(--text-secondary)",
    maxWidth: "600px",
    margin: "0 auto 40px",
    lineHeight: 1.6,
  },
  ctaGroup: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap" as const,
  },
  ctaPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 32px",
    background: "var(--gradient-amber)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-inverse)",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    border: "none",
    boxShadow: "0 4px 20px var(--amber-glow)",
  },
  ctaSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 32px",
    background: "transparent",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "16px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  stepsSection: {
    position: "relative",
    zIndex: 1,
    padding: "60px 40px 80px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  sectionLabel: {
    textAlign: "center" as const,
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--amber)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: "12px",
  },
  sectionTitle: {
    textAlign: "center" as const,
    fontSize: "32px",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "48px",
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  },
  stepCard: {
    position: "relative",
    padding: "32px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    backdropFilter: "blur(10px)",
    transition: "all var(--transition-base)",
  },
  stepNumber: {
    position: "absolute",
    top: "-12px",
    left: "24px",
    width: "32px",
    height: "32px",
    background: "var(--gradient-amber)",
    borderRadius: "var(--radius-full)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text-inverse)",
  },
  stepIcon: {
    width: "48px",
    height: "48px",
    background: "var(--amber-glow)",
    borderRadius: "var(--radius-lg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    color: "var(--amber)",
  },
  stepTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "8px",
  },
  stepDescription: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },
  featuresSection: {
    padding: "60px 40px 100px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  },
  featureCard: {
    padding: "24px",
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    transition: "border-color var(--transition-fast)",
  },
  featureIcon: {
    width: "40px",
    height: "40px",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
    color: "var(--text-secondary)",
  },
  featureTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "6px",
  },
  featureDescription: {
    fontSize: "13px",
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
  footer: {
    borderTop: "1px solid var(--border-subtle)",
    padding: "40px",
  },
  footerInner: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: "14px",
    color: "var(--text-muted)",
  },
  footerLinks: {
    display: "flex",
    gap: "24px",
  },
  footerLink: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "color var(--transition-fast)",
  },
};

// ── Components ────────────────────────────────────────────────

function StepCard({ number, icon, title, description, delay }: StepCardProps) {
  return (
    <div 
      className="card-hover animate-fadeInUp" 
      style={{ ...styles.stepCard, animationDelay: `${delay}ms` }}
    >
      <div style={styles.stepNumber}>{number}</div>
      <div style={styles.stepIcon}>{icon}</div>
      <h3 style={styles.stepTitle}>{title}</h3>
      <p style={styles.stepDescription}>{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <div 
      style={{...styles.featureCard, opacity: 0, animationDelay: `${delay}ms`}} 
      className="card-hover animate-fadeInUp"
    >
      <div style={styles.featureIcon}>{icon}</div>
      <h4 style={styles.featureTitle}>{title}</h4>
      <p style={styles.featureDescription}>{description}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { login, authenticated, ready } = usePrivy();
  const howItWorksRef = useRef<HTMLElement>(null);

  // Redirect to dashboard after successful authentication
  useEffect(() => {
    if (ready && authenticated) {
      router.push("/giveaway");
    }
  }, [ready, authenticated, router]);

  const handleGetStarted = () => {
    if (authenticated) {
      router.push("/giveaway");
    } else {
      login();
    }
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={styles.page}>
      {/* Hero glow effect */}
      <div style={styles.heroGlow} className="animate-pulse" />

      {/* Navigation */}
      <nav style={styles.nav} className="animate-fadeIn">
        <div style={styles.logo}>
          <img src="/logo-icon.png" alt="DropIn" style={{ width: "36px", height: "36px", borderRadius: "10px" }} />
          <span>DropIn</span>
        </div>
        <div style={styles.navLinks}>
          <span style={{...styles.navLink, cursor: "pointer"}} onClick={scrollToHowItWorks} className="landing-nav-links">How it works</span>
          <a href="https://github.com/danbuildss/drop-in" target="_blank" rel="noopener noreferrer" style={styles.navLink} className="landing-nav-links">Docs</a>
          <button 
            style={styles.navButton}
            onClick={handleGetStarted}
          >
            {authenticated ? "Dashboard" : "Sign In"}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero} className="landing-hero">
        <div style={styles.badge} className="animate-fadeInUp">
          <Shield size={14} />
          Verified on Base
        </div>
        <h1 style={{...styles.headline, opacity: 0, animationDelay: "100ms"}} className="animate-fadeInUp">
          <span style={styles.headlineAccent}>Scan. Register. Win.</span>{" "}
          Onchain Event Check-In
        </h1>
        <p style={{...styles.subtitle, opacity: 0, animationDelay: "200ms"}} className="animate-fadeInUp">
          The fairest way to run giveaways at crypto events. Attendees check in with their wallet, 
          winners are selected randomly on-chain. Fully transparent, no trust required.
        </p>
        <div style={{...styles.ctaGroup, opacity: 0, animationDelay: "300ms"}} className="animate-fadeInUp">
          <button style={styles.ctaPrimary} onClick={handleGetStarted} className="animate-glow">
            Get Started
            <ArrowRight size={18} />
          </button>
          <button style={styles.ctaSecondary} onClick={scrollToHowItWorks}>
            View Demo
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Steps Section */}
      <section ref={howItWorksRef} style={styles.stepsSection} id="how-it-works" className="landing-section">
        <p style={styles.sectionLabel}>How it works</p>
        <h2 style={styles.sectionTitle}>Three simple steps</h2>
        <div style={styles.stepsGrid}>
          <StepCard
            number={1}
            icon={<Calendar size={24} />}
            title="Create Event"
            description="Organizer creates an event on-chain. Get a unique QR code to share with attendees."
            delay={0}
          />
          <StepCard
            number={2}
            icon={<QrCode size={24} />}
            title="Attendees Check In"
            description="Attendees scan the QR code, connect their wallet, and check in — completely gasless."
            delay={100}
          />
          <StepCard
            number={3}
            icon={<Trophy size={24} />}
            title="Draw Winners"
            description="Run the giveaway on-chain. Winners are selected randomly and verifiable on BaseScan."
            delay={200}
          />
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.featuresSection} className="landing-section">
        <p style={styles.sectionLabel}>Why DropIn</p>
        <h2 style={styles.sectionTitle}>Built for trust</h2>
        <div style={styles.featuresGrid}>
          <FeatureCard
            icon={<Shield size={20} />}
            title="Fully On-Chain"
            description="Winner selection happens on Base. Anyone can verify the results on BaseScan."
            delay={0}
          />
          <FeatureCard
            icon={<Zap size={20} />}
            title="Gasless Check-In"
            description="Attendees don't pay gas to check in. We handle the infrastructure costs."
            delay={100}
          />
          <FeatureCard
            icon={<Users size={20} />}
            title="Multiple Login Options"
            description="Support for MetaMask, Coinbase Wallet, WalletConnect, email, and Google."
            delay={200}
          />
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner} className="landing-footer-inner">
          <span style={styles.footerText}>
            © 2026 DropIn. Built on Base.
          </span>
          <div style={styles.footerLinks} className="landing-footer-links">
            <a href="https://github.com/danbuildss/drop-in" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Documentation</a>
            <a href="https://github.com/danbuildss/drop-in" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>GitHub</a>
            <a href="https://x.com/whybasemedia" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
