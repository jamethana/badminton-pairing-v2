-- Indexes for stats page: pairings filtered by status = 'completed' and
-- OR across four player columns. Partial indexes per column let Postgres
-- use bitmap OR for the .or() filter.
CREATE INDEX idx_pairings_completed_team_a_p1 ON public.pairings(team_a_player_1) WHERE status = 'completed';
CREATE INDEX idx_pairings_completed_team_a_p2 ON public.pairings(team_a_player_2) WHERE status = 'completed';
CREATE INDEX idx_pairings_completed_team_b_p1 ON public.pairings(team_b_player_1) WHERE status = 'completed';
CREATE INDEX idx_pairings_completed_team_b_p2 ON public.pairings(team_b_player_2) WHERE status = 'completed';
