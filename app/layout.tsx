// ─────────────────────────────────────────────────────────────
//  app/layout.tsx — Root layout with Reown AppKit provider
// ─────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { headers } from "next/headers";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropIn — Onchain Event Check-In",
  description: "Scan. Register. Win. The fairest way to run event giveaways — verified onchain on Base.",
  openGraph: {
    title: "DropIn — Onchain Event Check-In",
    description: "Scan. Register. Win. The fairest way to run event giveaways — verified onchain on Base.",
    type: "website",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const headersList = await headers();
  const cookies = headersList.get("cookie");

  return (
    <html lang="en">
      <body>
        <Providers cookies={cookies}>{children}</Providers>
      </body>
    </html>
  );
}
