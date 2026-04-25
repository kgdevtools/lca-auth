-- Migration: add read boolean to contact_submissions
-- Run in Supabase SQL editor
ALTER TABLE contact_submissions
  ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;
