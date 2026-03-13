-- Migration: Add pairing rule and partner skill gap settings to sessions
-- These settings let moderators tune how the auto-pairing algorithm selects players.

CREATE TYPE public.pairing_rule AS ENUM ('least_played', 'longest_wait', 'balanced');

ALTER TABLE public.sessions
  ADD COLUMN pairing_rule              public.pairing_rule NOT NULL DEFAULT 'least_played',
  ADD COLUMN max_partner_skill_level_gap INTEGER            NOT NULL DEFAULT 2
    CHECK (max_partner_skill_level_gap >= 1 AND max_partner_skill_level_gap <= 10);

ALTER TABLE public.moderator_default_session_settings
  ADD COLUMN pairing_rule              public.pairing_rule NOT NULL DEFAULT 'least_played',
  ADD COLUMN max_partner_skill_level_gap INTEGER            NOT NULL DEFAULT 2
    CHECK (max_partner_skill_level_gap >= 1 AND max_partner_skill_level_gap <= 10);
