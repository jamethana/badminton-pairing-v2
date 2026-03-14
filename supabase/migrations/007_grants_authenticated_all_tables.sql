-- Grant table-level access for authenticated role on all app tables.
-- 006 already granted users. RLS on users (004/005) restricts rows; other tables
-- rely on app-level auth (session membership, is_moderator) in API routes.
-- Without these, client queries get "permission denied for table <name>".

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_players TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pairings TO authenticated;
GRANT SELECT, INSERT ON public.game_results TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.moderator_default_session_settings TO authenticated;
