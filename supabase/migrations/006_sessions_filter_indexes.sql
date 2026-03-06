-- Migration: Add indexes on sessions table for filter/order columns
-- Supports moderator sessions list filtering by created_by, status, and ordering by date.

-- Index the FK column (sessions_created_by_fkey) so filter/JOIN to users is fast
CREATE INDEX IF NOT EXISTS idx_sessions_created_by
  ON public.sessions (created_by);

-- Composite index for status filter + date ordering (equality column first, then range/order)
CREATE INDEX IF NOT EXISTS idx_sessions_status_date
  ON public.sessions (status, date DESC);
