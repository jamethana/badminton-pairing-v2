-- Fix and extend RLS on public.users.
--
-- The previous policy (004) used auth.uid() which is the Supabase auth UUID,
-- not the app user id stored in public.users.id. This app stores app_user_id
-- in JWT user_metadata (not auth.uid()), so all policies must use the JWT claim.
--
-- Three parts:
--   1. Helper functions (SECURITY DEFINER) to extract app_user_id from JWT and
--      check moderator status without hitting RLS.
--   2. Corrected SELECT policy: own row | same-session | moderator sees all.
--   3. New UPDATE policy: own row | moderator updates any row.

-- ── 1. Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'app_user_id')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_moderator FROM public.users WHERE id = public.current_app_user_id()),
    false
  );
$$;

-- ── 2. Fix SELECT policy ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_select_own_or_same_session" ON public.users;
CREATE POLICY "users_select_own_or_same_session"
  ON public.users
  FOR SELECT
  USING (
    -- Moderators can see all users (e.g. player list, assign court)
    public.current_user_is_moderator()
    -- Own row (getCurrentUser, is_moderator checks in API routes)
    OR id = public.current_app_user_id()
    -- Co-participants in any shared session (court view, player list)
    OR id IN (
      SELECT sp2.user_id
      FROM public.session_players sp2
      WHERE sp2.session_id IN (
        SELECT sp.session_id
        FROM public.session_players sp
        WHERE sp.user_id = public.current_app_user_id()
      )
    )
  );

-- ── 3. UPDATE policy ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_update_own_or_moderator" ON public.users;
CREATE POLICY "users_update_own_or_moderator"
  ON public.users
  FOR UPDATE
  USING (
    id = public.current_app_user_id()
    OR public.current_user_is_moderator()
  )
  WITH CHECK (
    id = public.current_app_user_id()
    OR public.current_user_is_moderator()
  );
