// ─────────────────────────────────────────────────────────────
//  app/layout.tsx — Root layout with Privy provider
// ─────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropIn — On-Chain Giveaway Draws",
  description: "The fairest way to run giveaways at crypto events — verified on-chain on Base.",
  openGraph: {
    title: "DropIn — On-Chain Giveaway Draws",
    description: "The fairest way to run giveaways at crypto events — verified on-chain on Base.",
    type: "website",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
