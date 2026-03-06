-- Migration: Allow authenticated users to self-join a session (insert own session_players row).
-- Used by the "Add myself to this session" flow when no pre-created slot exists.

CREATE POLICY "Session players insert self"
  ON session_players
  FOR INSERT
  WITH CHECK (user_id = current_user_id());
