-- Migration: Enable Supabase Realtime for session-related tables
-- Allows clients to subscribe to postgres_changes for live sync when
-- multiple moderators or players operate the same session.

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.sessions,
  public.session_players,
  public.pairings,
  public.game_results;
