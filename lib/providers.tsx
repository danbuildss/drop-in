// ─────────────────────────────────────────────────────────────
//  lib/providers.tsx — Reown AppKit + React Query + Farcaster providers
// ─────────────────────────────────────────────────────────────

"use client";

import { type ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { base } from "wagmi/chains";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// ── Constants ─────────────────────────────────────────────────
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

const metadata = {
  name: "DropIn",
  description: "Onchain Event Check-In — Scan. Register. Win.",
  url: typeof window !== "undefined" ? window.location.origin : "https://dropin.whybase.media",
  icons: ["/logo-icon.png"],
};

// ── Wagmi Adapter ─────────────────────────────────────────────
const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId,
  ssr: true,
});

// ── Create AppKit ─────────────────────────────────────────────
createAppKit({
  adapters: [wagmiAdapter],
  networks: [base],
  defaultNetwork: base,
  projectId,
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: false,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#F59E0B",
    "--w3m-color-mix": "#F59E0B",
    "--w3m-color-mix-strength": 20,
    "--w3m-border-radius-master": "2px",
  },
});

// ── Query Client ──────────────────────────────────────────────
const queryClient = new QueryClient();

// ── Farcaster Mini App Initialization ─────────────────────────
function FarcasterInit() {
  useEffect(() => {
    // Check if we're in a Farcaster mini app context
    const isMiniApp =
      typeof window !== "undefined" &&
      (window.location.search.includes("miniApp=true") ||
        document.referrer.includes("warpcast") ||
        document.referrer.includes("farcaster"));

    if (isMiniApp) {
      import("@farcaster/miniapp-sdk")
        .then(({ sdk }) => {
          sdk.actions.ready().catch(console.error);
        })
        .catch(console.error);
    }
  }, []);

  return null;
}

// ── Providers Component ───────────────────────────────────────
interface ProvidersProps {
  children: ReactNode;
  cookies?: string | null;
}

export function Providers({ children, cookies }: ProvidersProps) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  return (
    <>
      <FarcasterInit />
      <WagmiProvider
        config={wagmiAdapter.wagmiConfig as Config}
        initialState={initialState}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}
