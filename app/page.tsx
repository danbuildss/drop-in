// ─────────────────────────────────────────────────────────────
//  app/page.tsx — Landing redirect
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/giveaway");
}
