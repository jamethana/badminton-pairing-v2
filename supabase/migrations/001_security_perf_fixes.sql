-- Migration: Security hardening and performance indexes
-- Apply via: supabase db push  OR  run in Supabase SQL editor

-- ─── sec-1: Add auth_secret column for secure LINE auth ───────────────────────
-- Stores a per-user random secret used as the Supabase auth password.
-- NULL for existing users; will be populated on next login.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_secret TEXT;

-- ─── sec-3: Atomic sequence number via advisory lock ──────────────────────────
-- Replaces the application-level read-then-write race condition.
CREATE OR REPLACE FUNCTION next_pairing_sequence(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Advisory lock scoped to this transaction, keyed on session_id hash.
  -- Serializes concurrent calls for the same session.
  PERFORM pg_advisory_xact_lock(hashtext(p_session_id::text));

  RETURN (
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    FROM pairings
    WHERE session_id = p_session_id
  );
END;
$$;

-- ─── perf-4: Query performance indexes ───────────────────────────────────────
-- Composite index for the active-player filter on every pairing generation
CREATE INDEX IF NOT EXISTS idx_session_players_session_is_active
  ON session_players(session_id, is_active);

-- Index for ORDER BY sequence_number queries
CREATE INDEX IF NOT EXISTS idx_pairings_session_sequence
  ON pairings(session_id, sequence_number);

-- Index for ORDER BY display_name on the players list
CREATE INDEX IF NOT EXISTS idx_users_display_name
  ON users(display_name);
