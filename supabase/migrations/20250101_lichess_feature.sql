-- ================================================================
-- Lichess Coaching Feature - Database Migration
-- Created: 2025-01-01
-- Description: Creates tables for Lichess OAuth connections and
--              Lichess-specific coaching assignments
--
-- HOW TO USE:
--   Copy and paste this entire file into the Supabase SQL Editor
--   and run it. Safe to run multiple times (uses IF NOT EXISTS).
-- ================================================================


-- ----------------------------------------------------------------
-- TABLE: lichess_connections
-- Stores Lichess OAuth tokens for students who have connected
-- their Lichess account to the LCA Academy.
--
-- One connection per user (enforced by UNIQUE on user_id).
-- Status flow: 'active' → 'pending_reconnect' (student requests
-- disconnect) → deleted (admin approves, student can reconnect)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lichess_connections (
  id                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  user_id            uuid                     NOT NULL,
  lichess_username   text                     NOT NULL,
  access_token       text                     NOT NULL,
  token_type         text                     NOT NULL DEFAULT 'Bearer',
  scope              text                     NOT NULL,
  expires_in         integer                  NULL,
  connected_at       timestamp with time zone NOT NULL DEFAULT now(),
  last_synced_at     timestamp with time zone NULL,
  is_active          boolean                  NOT NULL DEFAULT true,
  status             text                     NOT NULL DEFAULT 'active',
  created_at         timestamp with time zone NOT NULL DEFAULT now(),
  updated_at         timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT lichess_connections_pkey
    PRIMARY KEY (id),

  -- One Lichess connection per user
  CONSTRAINT lichess_connections_user_id_key
    UNIQUE (user_id),

  CONSTRAINT lichess_connections_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (id)
    ON DELETE CASCADE,

  CONSTRAINT lichess_connections_status_check
    CHECK (status = ANY (ARRAY['active'::text, 'pending_reconnect'::text, 'revoked'::text]))

) TABLESPACE pg_default;

-- Indexes for lichess_connections
CREATE INDEX IF NOT EXISTS idx_lichess_connections_user
  ON public.lichess_connections USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_lichess_connections_username
  ON public.lichess_connections USING btree (lichess_username) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_lichess_connections_status
  ON public.lichess_connections USING btree (status) TABLESPACE pg_default;


-- ----------------------------------------------------------------
-- TABLE: lichess_assignments
-- Lichess-specific assignments created by coaches for their students.
-- Separate from lesson_assignments (which handles academy lessons).
--
-- Assignment types:
--   puzzle      - Solve specific Lichess puzzle(s)
--   game_review - Review a specific game (URL/ID in details)
--   opening     - Study a specific opening (name + color in details)
--   note        - General coaching note (no completion tracking)
--
-- Details JSONB examples:
--   puzzle:      { "puzzle_id": "abc12", "theme": "fork" }
--   game_review: { "game_id": "Xyz99", "url": "https://lichess.org/Xyz99" }
--   opening:     { "name": "Sicilian Defense", "color": "black", "eco": "B20" }
--   note:        { "content": "Focus on rook endgames this week." }
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lichess_assignments (
  id             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  coach_id       uuid                     NOT NULL,
  student_id     uuid                     NOT NULL,
  type           text                     NOT NULL,
  title          text                     NOT NULL,
  description    text                     NULL,
  details        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  status         text                     NOT NULL DEFAULT 'pending',
  priority       text                     NOT NULL DEFAULT 'normal',
  due_date       timestamp with time zone NULL,
  assigned_at    timestamp with time zone NOT NULL DEFAULT now(),
  completed_at   timestamp with time zone NULL,
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  updated_at     timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT lichess_assignments_pkey
    PRIMARY KEY (id),

  CONSTRAINT lichess_assignments_coach_id_fkey
    FOREIGN KEY (coach_id)
    REFERENCES public.profiles (id)
    ON DELETE CASCADE,

  CONSTRAINT lichess_assignments_student_id_fkey
    FOREIGN KEY (student_id)
    REFERENCES public.profiles (id)
    ON DELETE CASCADE,

  CONSTRAINT lichess_assignments_type_check
    CHECK (type = ANY (ARRAY[
      'puzzle'::text,
      'game_review'::text,
      'opening'::text,
      'note'::text
    ])),

  CONSTRAINT lichess_assignments_status_check
    CHECK (status = ANY (ARRAY[
      'pending'::text,
      'in_progress'::text,
      'completed'::text
    ])),

  CONSTRAINT lichess_assignments_priority_check
    CHECK (priority = ANY (ARRAY[
      'low'::text,
      'normal'::text,
      'high'::text
    ]))

) TABLESPACE pg_default;

-- Indexes for lichess_assignments
CREATE INDEX IF NOT EXISTS idx_lichess_assignments_coach
  ON public.lichess_assignments USING btree (coach_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_lichess_assignments_student
  ON public.lichess_assignments USING btree (student_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_lichess_assignments_status
  ON public.lichess_assignments USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_lichess_assignments_type
  ON public.lichess_assignments USING btree (type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_lichess_assignments_student_status
  ON public.lichess_assignments USING btree (student_id, status) TABLESPACE pg_default;


-- ================================================================
-- VERIFICATION
-- After running, execute the query below to confirm both tables exist:
--
-- SELECT table_name, obj_description(pgc.oid) AS description
-- FROM information_schema.tables t
-- JOIN pg_class pgc ON pgc.relname = t.table_name
-- WHERE t.table_schema = 'public'
--   AND t.table_name IN ('lichess_connections', 'lichess_assignments')
-- ORDER BY t.table_name;
-- ================================================================
