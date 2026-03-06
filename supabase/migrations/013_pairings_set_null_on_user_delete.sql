-- Retain match history when a user is deleted: set pairing slots to NULL instead of CASCADE delete.
-- Requires pairings player columns to be nullable and FKs to use ON DELETE SET NULL.

-- Make the four player columns nullable
ALTER TABLE public.pairings
  ALTER COLUMN team_a_player_1 DROP NOT NULL,
  ALTER COLUMN team_a_player_2 DROP NOT NULL,
  ALTER COLUMN team_b_player_1 DROP NOT NULL,
  ALTER COLUMN team_b_player_2 DROP NOT NULL;

-- Replace CASCADE with SET NULL so the slot becomes NULL when the user is deleted
ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_a_player_1_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_a_player_1_fkey
  FOREIGN KEY (team_a_player_1) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_a_player_2_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_a_player_2_fkey
  FOREIGN KEY (team_a_player_2) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_b_player_1_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_b_player_1_fkey
  FOREIGN KEY (team_b_player_1) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.pairings
  DROP CONSTRAINT IF EXISTS pairings_team_b_player_2_fkey;
ALTER TABLE public.pairings
  ADD CONSTRAINT pairings_team_b_player_2_fkey
  FOREIGN KEY (team_b_player_2) REFERENCES public.users(id) ON DELETE SET NULL;
