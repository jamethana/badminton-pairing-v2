-- Allow moderator to toggle whether skill level pills are shown in the
-- Available Players list on the session Game tab.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS show_skill_level_pills boolean NOT NULL DEFAULT true;
