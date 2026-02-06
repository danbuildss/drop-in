// ─────────────────────────────────────────────────────────────
//  lib/providers.tsx — Privy + React Query + Farcaster providers
// ─────────────────────────────────────────────────────────────

"use client";

import { type ReactNode, useState, useEffect } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "viem/chains";

interface ProvidersProps {
  children: ReactNode;
}

// Farcaster Mini App initialization
function FarcasterInit() {
  useEffect(() => {
    // Check if we're in a Farcaster mini app context
    const isMiniApp = 
      typeof window !== "undefined" && 
      (window.location.search.includes("miniApp=true") || 
       document.referrer.includes("warpcast") ||
       document.referrer.includes("farcaster"));
    
    if (isMiniApp) {
      import("@farcaster/miniapp-sdk").then(({ sdk }) => {
        sdk.actions.ready().catch(console.error);
      }).catch(console.error);
    }
  }, []);
  
  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState<QueryClient>(() => new QueryClient());

  return (
    <>
      <FarcasterInit />
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        config={{
          appearance: {
            theme: "dark",
            accentColor: "#0000FF",
            logo: "/logo-full.png",
            showWalletLoginFirst: true,
          },
          loginMethods: [
            "wallet",
            "email",
            "google",
          ],
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
          },
          defaultChain: base,
          supportedChains: [base],
          walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        }}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </PrivyProvider>
    </>
  );
}
