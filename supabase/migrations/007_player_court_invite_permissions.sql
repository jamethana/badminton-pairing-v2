-- Migration: Add player court and invite permissions to sessions
-- - allow_player_add_remove_courts: when true, players in the session may
--   add or remove courts (subject to API/server-side checks).
-- - allow_player_access_invite_qr: when true, non-moderator players can see
--   the invite link and QR code for the session.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS allow_player_add_remove_courts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_player_access_invite_qr boolean NOT NULL DEFAULT false;

