-- Migration: add tournament_aliases to profiles
-- Run in Supabase SQL editor
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tournament_aliases text[] NOT NULL DEFAULT '{}';
