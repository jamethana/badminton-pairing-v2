-- Migration: Add optional notes column to sessions (Edit Session feature)
-- Apply via: supabase db push  OR  run in Supabase SQL editor
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS notes text;
