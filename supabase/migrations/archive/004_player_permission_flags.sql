-- Migration: Add player-level permission flags to sessions
-- These three boolean flags let moderators grant players extra actions
-- within a specific session. All default to false (read-only).

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS allow_player_assign_empty_court boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_player_record_own_result  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_player_record_any_result  boolean NOT NULL DEFAULT false;

-- ─── RLS: pairings INSERT for players ─────────────────────────────────────
-- When allow_player_assign_empty_court is true for a session, players who
-- are members of that session may INSERT new pairings (assigning courts).
-- The API layer additionally validates that the target court is empty.
CREATE POLICY "Pairings player insert if session allows"
  ON pairings
  FOR INSERT
  WITH CHECK (
    session_id IN (SELECT get_current_user_session_ids())
    AND (
      SELECT allow_player_assign_empty_court
      FROM sessions
      WHERE id = session_id
    )
  );

-- ─── RLS: game_results INSERT for players (own game) ──────────────────────
-- Replace the existing "own game" policy so it also checks the session flag.
DROP POLICY IF EXISTS "Game results player insert own game" ON game_results;

CREATE POLICY "Game results player insert own game"
  ON game_results
  FOR INSERT
  WITH CHECK (
    pairing_id IN (
      SELECT p.id
      FROM pairings p
      WHERE (
        p.team_a_player_1 = current_user_id() OR
        p.team_a_player_2 = current_user_id() OR
        p.team_b_player_1 = current_user_id() OR
        p.team_b_player_2 = current_user_id()
      )
      AND (
        SELECT (allow_player_record_own_result OR allow_player_record_any_result)
        FROM sessions
        WHERE id = p.session_id
      )
    )
  );

-- ─── RLS: game_results INSERT for any game in session ─────────────────────
-- When allow_player_record_any_result is true, any session member may record
-- results for any pairing within that session (not just their own games).
CREATE POLICY "Game results player insert any if session allows"
  ON game_results
  FOR INSERT
  WITH CHECK (
    pairing_id IN (
      SELECT p.id
      FROM pairings p
      JOIN sessions s ON s.id = p.session_id
      WHERE s.allow_player_record_any_result = true
        AND p.session_id IN (SELECT get_current_user_session_ids())
    )
  );
