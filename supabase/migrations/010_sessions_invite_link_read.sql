-- Migration: Allow authenticated users to read any session (invite link access)
-- Enables players with the invite link to load the session page and self-join or claim a slot,
-- even before they are in session_players. Session IDs are UUIDs; no listing is exposed.

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read any session for invite link"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
