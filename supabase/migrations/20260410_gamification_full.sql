-- ================================================================
-- Gamification Full Migration
-- Created: 2026-04-10
-- Adds: academy_profiles, points_transactions, grant_points()
-- Updates: level formula in grant_points (CASE thresholds, not sqrt)
--
-- Run AFTER: 20260406_student_gamification.sql
--
-- HOW TO USE:
--   Paste into Supabase SQL Editor and run.
--   Safe to run multiple times (IF NOT EXISTS / OR REPLACE).
-- ================================================================


-- ----------------------------------------------------------------
-- STEP 1: academy_profiles
-- One row per student. Stores tier and optional display info.
-- Coach sets tier manually via the students UI.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_profiles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username    TEXT,
  tier        TEXT NOT NULL DEFAULT 'beginner'
                CONSTRAINT academy_profiles_tier_check
                CHECK (tier IN ('beginner', 'intermediate', 'advanced')),
  elo_rating  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT academy_profiles_student_id_key UNIQUE (student_id)
);

COMMENT ON TABLE public.academy_profiles IS
  'Per-student academy metadata: tier (set by coach), optional username, elo_rating';

-- updated_at trigger (reuses set_updated_at from 20260327 migration)
DROP TRIGGER IF EXISTS set_academy_profiles_updated_at ON public.academy_profiles;
CREATE TRIGGER set_academy_profiles_updated_at
  BEFORE UPDATE ON public.academy_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_academy_profiles_student
  ON public.academy_profiles USING btree (student_id);

CREATE INDEX IF NOT EXISTS idx_academy_profiles_tier
  ON public.academy_profiles USING btree (tier);


-- ----------------------------------------------------------------
-- STEP 2: points_transactions
-- Append-only ledger. Every point ever granted is a row here.
-- All writes go through grant_points() (SECURITY DEFINER) so
-- no INSERT policy is needed — SECURITY DEFINER bypasses RLS.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points          INTEGER NOT NULL CHECK (points > 0),
  action_type     TEXT NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.points_transactions IS
  'Append-only ledger of every point grant. action_type values: '
  'lesson_complete_puzzle, lesson_complete_study, quiz_bonus, '
  'first_attempt_mastery, daily_activity, streak_bonus, streak_weekly, coach_award';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_points_transactions_student
  ON public.points_transactions USING btree (student_id);

CREATE INDEX IF NOT EXISTS idx_points_transactions_action_type
  ON public.points_transactions USING btree (action_type);

CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at
  ON public.points_transactions USING btree (created_at DESC);


-- ----------------------------------------------------------------
-- STEP 3: RLS — academy_profiles
-- ----------------------------------------------------------------
ALTER TABLE public.academy_profiles ENABLE ROW LEVEL SECURITY;

-- Students: read own row
DROP POLICY IF EXISTS "Students can view own academy profile" ON public.academy_profiles;
CREATE POLICY "Students can view own academy profile"
  ON public.academy_profiles FOR SELECT
  USING (auth.uid() = student_id);

-- Coaches: read + update their students' rows
DROP POLICY IF EXISTS "Coaches can view student academy profiles" ON public.academy_profiles;
CREATE POLICY "Coaches can view student academy profiles"
  ON public.academy_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_students
      WHERE coach_id = auth.uid() AND student_id = public.academy_profiles.student_id
    )
  );

DROP POLICY IF EXISTS "Coaches can update student academy profiles" ON public.academy_profiles;
CREATE POLICY "Coaches can update student academy profiles"
  ON public.academy_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_students
      WHERE coach_id = auth.uid() AND student_id = public.academy_profiles.student_id
    )
  );

-- Admins: full access
DROP POLICY IF EXISTS "Admins have full access to academy profiles" ON public.academy_profiles;
CREATE POLICY "Admins have full access to academy profiles"
  ON public.academy_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ----------------------------------------------------------------
-- STEP 4: RLS — points_transactions
-- Writes only happen through grant_points() (SECURITY DEFINER),
-- which bypasses RLS. SELECT policies only.
-- ----------------------------------------------------------------
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Students: read own rows
DROP POLICY IF EXISTS "Students can view own point transactions" ON public.points_transactions;
CREATE POLICY "Students can view own point transactions"
  ON public.points_transactions FOR SELECT
  USING (auth.uid() = student_id);

-- Coaches: read their students' rows
DROP POLICY IF EXISTS "Coaches can view student point transactions" ON public.points_transactions;
CREATE POLICY "Coaches can view student point transactions"
  ON public.points_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_students
      WHERE coach_id = auth.uid() AND student_id = public.points_transactions.student_id
    )
  );

-- Admins: read all
DROP POLICY IF EXISTS "Admins can view all point transactions" ON public.points_transactions;
CREATE POLICY "Admins can view all point transactions"
  ON public.points_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ----------------------------------------------------------------
-- STEP 5: grant_points()
--
-- Single entry point for all point grants. Handles:
--   1. Insert to points_transactions (the ledger)
--   2. Ensure student_progress_summary row exists (safety net)
--   3. Increment total_points
--   4. Recompute level (chess-themed CASE thresholds)
--   5. Update last_activity_date on every call
--   6. Update streak counters (daily_activity action only)
--   7. Increment activity-specific counters
--      (puzzles_solved, studies_completed, lessons_completed)
--   8. Return JSONB result for the app layer
--      { points_earned, new_total, new_level, level_up }
--
-- Achievement checks are handled in the app layer (gamificationService.ts)
-- using the returned stats, NOT inside this function. Keeps DB logic
-- minimal and achievements iterable in TypeScript.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_points(
  p_student_id      UUID,
  p_points          INTEGER,
  p_action_type     TEXT,
  p_reference_id    UUID    DEFAULT NULL,
  p_reference_type  TEXT    DEFAULT NULL,
  p_metadata        JSONB   DEFAULT '{}'::jsonb,
  p_note            TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_level         INTEGER;
  v_new_level         INTEGER;
  v_new_total         INTEGER;
  v_today             DATE    := CURRENT_DATE;
  v_yesterday         DATE    := CURRENT_DATE - INTERVAL '1 day';
  v_last_activity     DATE;
  v_current_streak    INTEGER;
BEGIN
  -- Guard: points must be positive (schema CHECK covers DB level, this covers SECURITY DEFINER path)
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'grant_points: points must be > 0, got %', p_points;
  END IF;

  -- 1. Insert to ledger
  INSERT INTO public.points_transactions (
    student_id, points, action_type, reference_id, reference_type, metadata, note
  ) VALUES (
    p_student_id, p_points, p_action_type, p_reference_id, p_reference_type, p_metadata, p_note
  );

  -- 2. Ensure summary row exists (safety net — trigger should have created it, but just in case)
  INSERT INTO public.student_progress_summary (student_id)
  VALUES (p_student_id)
  ON CONFLICT (student_id) DO NOTHING;

  -- 3. Capture current state BEFORE the main update.
  --    v_last_activity and v_current_streak must be read here — step 4 overwrites
  --    last_activity_date, so reading them after would always see v_today.
  SELECT level, last_activity_date, current_streak_days
  INTO v_old_level, v_last_activity, v_current_streak
  FROM public.student_progress_summary
  WHERE student_id = p_student_id;

  -- 4. Increment total_points, recompute level, update last_activity_date
  UPDATE public.student_progress_summary
  SET
    total_points       = total_points + p_points,
    level              = CASE
                           WHEN (total_points + p_points) >= 1500 THEN 6
                           WHEN (total_points + p_points) >= 1000 THEN 5
                           WHEN (total_points + p_points) >=  600 THEN 4
                           WHEN (total_points + p_points) >=  300 THEN 3
                           WHEN (total_points + p_points) >=  100 THEN 2
                           ELSE 1
                         END,
    last_activity_date = v_today,
    updated_at         = now()
  WHERE student_id = p_student_id
  RETURNING total_points, level INTO v_new_total, v_new_level;

  -- 5. Streak update (daily_activity action only).
  --    Uses v_last_activity / v_current_streak captured in step 3 (pre-update values).
  IF p_action_type = 'daily_activity' THEN
    UPDATE public.student_progress_summary
    SET
      current_streak_days = CASE
                              WHEN v_last_activity = v_yesterday THEN v_current_streak + 1
                              WHEN v_last_activity = v_today     THEN v_current_streak
                              ELSE 1
                            END,
      longest_streak_days = GREATEST(
                              longest_streak_days,
                              CASE
                                WHEN v_last_activity = v_yesterday THEN v_current_streak + 1
                                WHEN v_last_activity = v_today     THEN v_current_streak
                                ELSE 1
                              END
                            )
    WHERE student_id = p_student_id;
  END IF;

  -- 6. Activity-specific counters
  IF p_action_type = 'lesson_complete_puzzle' THEN
    UPDATE public.student_progress_summary
    SET
      puzzles_solved    = puzzles_solved + 1,
      lessons_completed = lessons_completed + 1
    WHERE student_id = p_student_id;

  ELSIF p_action_type = 'lesson_complete_study' THEN
    UPDATE public.student_progress_summary
    SET
      studies_completed = studies_completed + 1,
      lessons_completed = lessons_completed + 1
    WHERE student_id = p_student_id;
  END IF;

  -- 7. Return result for app layer
  RETURN jsonb_build_object(
    'points_earned', p_points,
    'new_total',     v_new_total,
    'new_level',     v_new_level,
    'level_up',      (v_new_level > COALESCE(v_old_level, 1))
  );
END;
$$;

COMMENT ON FUNCTION public.grant_points IS
  'Single entry point for all point grants. Inserts ledger row, '
  'updates student_progress_summary (points, level, streak, counters), '
  'returns { points_earned, new_total, new_level, level_up } JSONB.';
