-- Allow moderator delete player (users row) to succeed by fixing FK ON DELETE behavior.
-- Without this, DELETE from users fails with FK violation (sessions, pairings, game_results).

-- sessions.created_by: set to NULL when the creating user is deleted (keep session)
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_created_by_fkey;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- game_results.recorded_by: set to NULL when the recording user is deleted (keep result)
ALTER TABLE public.game_results
  DROP CONSTRAINT IF EXISTS game_results_recorded_by_fkey;
ALTER TABLE public.game_results
  ADD CONSTRAINT game_results_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- pairings: delete pairing rows that reference the deleted user (player columns are NOT NULL)
ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_a_player_1_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_a_player_1_fkey
  FOREIGN KEY (team_a_player_1) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_a_player_2_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_a_player_2_fkey
  FOREIGN KEY (team_a_player_2) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_b_player_1_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_b_player_1_fkey
  FOREIGN KEY (team_b_player_1) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_b_player_2_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_b_player_2_fkey
  FOREIGN KEY (team_b_player_2) REFERENCES public.users(id) ON DELETE CASCADE;
