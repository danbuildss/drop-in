// ─────────────────────────────────────────────────────────────
//  lib/supabase-server.ts — Server-side Supabase client
//
//  Uses the service_role key so API routes can write to all
//  tables without RLS restrictions. NEVER import this in
//  client components — only in app/api/ route handlers.
//
//  MVP approach: API routes validate the wallet address from
//  the request body. In V2, replace with proper SIWE JWT auth.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey
);
