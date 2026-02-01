// ─────────────────────────────────────────────────────────────
//  lib/providers.tsx — All Web3 context providers in one place
// ─────────────────────────────────────────────────────────────

"use client";

import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { wagmiConfig } from "@/lib/wagmi";

// Import OnchainKit default styles
import "@coinbase/onchainkit/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient lives in state so it's not re-created on every render
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: "auto",
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
