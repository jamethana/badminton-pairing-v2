-- Per-moderator default session settings (used when creating a new session).
-- Excludes date and notes; all other session form fields are stored.

CREATE TABLE public.moderator_default_session_settings (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '12:00',
  location text,
  num_courts integer NOT NULL DEFAULT 4 CHECK (num_courts >= 1 AND num_courts <= 20),
  max_players integer NOT NULL DEFAULT 24 CHECK (max_players >= 1),
  allow_player_assign_empty_court boolean NOT NULL DEFAULT false,
  allow_player_record_own_result boolean NOT NULL DEFAULT false,
  allow_player_record_any_result boolean NOT NULL DEFAULT false,
  show_skill_level_pills boolean NOT NULL DEFAULT true,
  allow_player_add_remove_courts boolean NOT NULL DEFAULT false,
  allow_player_access_invite_qr boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: moderators can only read/upsert their own row (by app_user_id in JWT).
ALTER TABLE public.moderator_default_session_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session defaults"
  ON public.moderator_default_session_settings
  FOR SELECT
  USING (user_id = ((auth.jwt() -> 'user_metadata' ->> 'app_user_id'))::uuid);

CREATE POLICY "Users can insert own session defaults"
  ON public.moderator_default_session_settings
  FOR INSERT
  WITH CHECK (user_id = ((auth.jwt() -> 'user_metadata' ->> 'app_user_id'))::uuid);

CREATE POLICY "Users can update own session defaults"
  ON public.moderator_default_session_settings
  FOR UPDATE
  USING (user_id = ((auth.jwt() -> 'user_metadata' ->> 'app_user_id'))::uuid)
  WITH CHECK (user_id = ((auth.jwt() -> 'user_metadata' ->> 'app_user_id'))::uuid);
