-- ================================================================
-- Baseline schema for badminton-pairing-v2
-- Collapsed from migrations 001–013 into a single authoritative file.
-- Represents the complete schema the application expects as of 2026-03-14.
-- ================================================================

-- ── Extensions ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- ── Enums ─────────────────────────────────────────────────────────
CREATE TYPE public.session_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE public.pairing_status AS ENUM ('in_progress', 'completed', 'voided');
CREATE TYPE public.pairing_rule   AS ENUM ('least_played', 'longest_wait', 'balanced');
CREATE TYPE public.winner_team    AS ENUM ('team_a', 'team_b');

-- ── Functions ─────────────────────────────────────────────────────

-- Trigger function: keeps updated_at current on every UPDATE.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Atomic sequence number via advisory lock.
-- Prevents race conditions when multiple requests generate pairings simultaneously.
CREATE OR REPLACE FUNCTION public.next_pairing_sequence(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_session_id::text));
  RETURN (
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    FROM public.pairings
    WHERE session_id = p_session_id
  );
END;
$$;

-- ── Tables ────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id                      UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  line_user_id            TEXT        UNIQUE,
  display_name            TEXT        NOT NULL,
  picture_url             TEXT,
  is_moderator            BOOLEAN     NOT NULL DEFAULT false,
  skill_level             INTEGER     NOT NULL DEFAULT 5 CHECK (skill_level >= 1 AND skill_level <= 10),
  calculated_skill_rating NUMERIC,
  auth_secret             TEXT,
  trueskill_mu            NUMERIC,
  trueskill_sigma         NUMERIC,
  trueskill_updated_at    TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sessions (
  id                              UUID                  PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name                            TEXT                  NOT NULL,
  date                            DATE                  NOT NULL,
  start_time                      TIME                  NOT NULL,
  end_time                        TIME                  NOT NULL,
  location                        TEXT,
  num_courts                      INTEGER               NOT NULL DEFAULT 4 CHECK (num_courts >= 1 AND num_courts <= 20),
  max_players                     INTEGER               NOT NULL DEFAULT 24 CHECK (max_players >= 2 AND max_players <= 100),
  status                          public.session_status NOT NULL DEFAULT 'draft',
  court_names                     JSONB                 NOT NULL DEFAULT '{}',
  notes                           TEXT,
  show_skill_level_pills          BOOLEAN               NOT NULL DEFAULT true,
  allow_player_assign_empty_court BOOLEAN               NOT NULL DEFAULT false,
  allow_player_record_own_result  BOOLEAN               NOT NULL DEFAULT false,
  allow_player_record_any_result  BOOLEAN               NOT NULL DEFAULT false,
  allow_player_add_remove_courts  BOOLEAN               NOT NULL DEFAULT false,
  allow_player_access_invite_qr   BOOLEAN               NOT NULL DEFAULT true,
  pairing_rule                    public.pairing_rule    NOT NULL DEFAULT 'least_played',
  max_partner_skill_level_gap    INTEGER               NOT NULL DEFAULT 2
    CHECK (max_partner_skill_level_gap >= 1 AND max_partner_skill_level_gap <= 10),
  created_by                      UUID                  REFERENCES public.users(id) ON DELETE SET NULL,
  created_at                      TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE TABLE public.session_players (
  id         UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  session_id UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE public.pairings (
  id              UUID                  PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  session_id      UUID                  NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  court_number    INTEGER               NOT NULL CHECK (court_number >= 1),
  sequence_number INTEGER               NOT NULL DEFAULT 1,
  status          public.pairing_status NOT NULL DEFAULT 'in_progress',
  team_a_player_1 UUID                  REFERENCES public.users(id) ON DELETE SET NULL,
  team_a_player_2 UUID                  REFERENCES public.users(id) ON DELETE SET NULL,
  team_b_player_1 UUID                  REFERENCES public.users(id) ON DELETE SET NULL,
  team_b_player_2 UUID                  REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE public.game_results (
  id           UUID               PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  pairing_id   UUID               NOT NULL UNIQUE REFERENCES public.pairings(id) ON DELETE CASCADE,
  team_a_score INTEGER            NOT NULL CHECK (team_a_score >= 0),
  team_b_score INTEGER            NOT NULL CHECK (team_b_score >= 0),
  winner_team  public.winner_team NOT NULL,
  recorded_by  UUID               REFERENCES public.users(id) ON DELETE SET NULL,
  recorded_at  TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE TABLE public.moderator_default_session_settings (
  user_id                         UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name                            TEXT        NOT NULL DEFAULT 'Badminton Session',
  start_time                      TIME        NOT NULL DEFAULT '09:00',
  end_time                        TIME        NOT NULL DEFAULT '12:00',
  location                        TEXT,
  num_courts                      INTEGER     NOT NULL DEFAULT 4  CHECK (num_courts >= 1 AND num_courts <= 20),
  max_players                     INTEGER     NOT NULL DEFAULT 24 CHECK (max_players >= 1),
  allow_player_assign_empty_court BOOLEAN     NOT NULL DEFAULT false,
  allow_player_record_own_result  BOOLEAN     NOT NULL DEFAULT false,
  allow_player_record_any_result  BOOLEAN     NOT NULL DEFAULT false,
  show_skill_level_pills          BOOLEAN     NOT NULL DEFAULT true,
  allow_player_add_remove_courts  BOOLEAN     NOT NULL DEFAULT false,
  allow_player_access_invite_qr   BOOLEAN     NOT NULL DEFAULT true,
  pairing_rule                    public.pairing_rule NOT NULL DEFAULT 'least_played',
  max_partner_skill_level_gap    INTEGER     NOT NULL DEFAULT 2
    CHECK (max_partner_skill_level_gap >= 1 AND max_partner_skill_level_gap <= 10),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Triggers ──────────────────────────────────────────────────────

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_mod_defaults_updated_at
  BEFORE UPDATE ON public.moderator_default_session_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_users_display_name ON public.users(display_name);

CREATE INDEX idx_sessions_created_by   ON public.sessions(created_by);
CREATE INDEX idx_sessions_status_date  ON public.sessions(status, date DESC);

CREATE INDEX idx_session_players_session          ON public.session_players(session_id);
CREATE INDEX idx_session_players_user             ON public.session_players(user_id);
CREATE INDEX idx_session_players_session_is_active ON public.session_players(session_id, is_active);

CREATE INDEX idx_pairings_session          ON public.pairings(session_id);
CREATE INDEX idx_pairings_court            ON public.pairings(session_id, court_number);
CREATE INDEX idx_pairings_status           ON public.pairings(session_id, status);
CREATE INDEX idx_pairings_session_sequence ON public.pairings(session_id, sequence_number);

CREATE INDEX idx_game_results_pairing ON public.game_results(pairing_id);

-- ── Realtime ──────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.sessions,
  public.session_players,
  public.pairings,
  public.game_results;
