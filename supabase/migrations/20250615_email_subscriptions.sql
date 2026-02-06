-- ─────────────────────────────────────────────────────────────
--  Migration: Email Subscriptions Table
--  Run this in Supabase SQL Editor or via CLI
-- ─────────────────────────────────────────────────────────────

-- Create email_subscriptions table
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing',
  wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint on email (case-insensitive)
  CONSTRAINT email_subscriptions_email_key UNIQUE (lower(email))
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_email ON email_subscriptions (lower(email));
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_source ON email_subscriptions (source);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_wallet ON email_subscriptions (lower(wallet)) WHERE wallet IS NOT NULL;

-- RLS policies (allow public inserts, restrict reads to service role)
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe" ON email_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read (for admin exports)
CREATE POLICY "Service role can read all" ON email_subscriptions
  FOR SELECT TO service_role
  USING (true);

-- Comment for documentation
COMMENT ON TABLE email_subscriptions IS 'Email newsletter subscriptions for DropIn updates';
COMMENT ON COLUMN email_subscriptions.source IS 'Where the user subscribed: landing, post-checkin, etc.';
COMMENT ON COLUMN email_subscriptions.wallet IS 'Optional wallet address if user was connected';
