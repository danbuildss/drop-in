// ─────────────────────────────────────────────────────────────
//  app/layout.tsx — Root layout with all Web3 providers
// ─────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropIn Giveaway",
  description: "On-chain giveaway draws on Base",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
