-- Allow players to see other players' names in sessions they share.
-- Without this, session_players join to users(*) returns null for other users (RLS blocks),
-- so the UI shows "Deleted user" for everyone except themselves.
-- Moderators already get allUsers separately, so they are unaffected.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_or_same_session" ON public.users;
CREATE POLICY "users_select_own_or_same_session"
  ON public.users
  FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT sp2.user_id
      FROM public.session_players sp2
      WHERE sp2.session_id IN (
        SELECT sp.session_id
        FROM public.session_players sp
        WHERE sp.user_id = auth.uid()
      )
    )
  );
