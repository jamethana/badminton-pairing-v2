-- Migration: Add TrueSkill-style rating fields to users
-- Apply via: supabase db push OR run in Supabase SQL editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS trueskill_mu DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS trueskill_sigma DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS trueskill_updated_at TIMESTAMPTZ;

