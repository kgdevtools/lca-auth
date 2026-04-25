-- ================================================================
-- Student Gamification & Progress Tracking - Database Migration
-- Created: 2026-04-06
-- Description: Creates tables for persistent student points, 
--              achievements, and progress tracking.
--
-- HOW TO USE:
--   Copy and paste this entire file into the Supabase SQL Editor
--   and run it. Safe to run multiple times (uses IF NOT EXISTS).
-- ================================================================

-- ----------------------------------------------------------------
-- STEP 1: Create student_progress_summary table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_progress_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Points system
  total_points INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  
  -- Streak tracking
  current_streak_days INTEGER DEFAULT 0 NOT NULL,
  longest_streak_days INTEGER DEFAULT 0 NOT NULL,
  last_activity_date DATE,
  
  -- Statistics
  puzzles_solved INTEGER DEFAULT 0 NOT NULL,
  studies_completed INTEGER DEFAULT 0 NOT NULL,
  lessons_completed INTEGER DEFAULT 0 NOT NULL,
  total_time_minutes INTEGER DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.student_progress_summary IS 'Stores cumulative gamification data for students: points, level, streaks, and stats';

-- ----------------------------------------------------------------
-- STEP 2: Create student_achievements table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  
  -- Track when earned
  earned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Prevent duplicate achievements
  CONSTRAINT student_achievements_student_key UNIQUE (student_id, achievement_key)
);

COMMENT ON TABLE public.student_achievements IS 'Stores earned badges and achievements for students';

-- ----------------------------------------------------------------
-- STEP 3: Create student_study_progress table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_study_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  
  -- Study-specific tracking
  current_chapter INTEGER DEFAULT 0 NOT NULL,
  total_chapters INTEGER DEFAULT 0 NOT NULL,
  chapters_completed INTEGER DEFAULT 0 NOT NULL,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Prevent duplicate progress per student per lesson
  CONSTRAINT student_study_progress_student_lesson_key UNIQUE (student_id, lesson_id)
);

COMMENT ON TABLE public.student_study_progress IS 'Tracks progress through study chapters within lessons';

-- ----------------------------------------------------------------
-- STEP 4: Create indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_student_progress_summary_student
  ON public.student_progress_summary USING btree (student_id);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student
  ON public.student_achievements USING btree (student_id);

CREATE INDEX IF NOT EXISTS idx_student_study_progress_student
  ON public.student_study_progress USING btree (student_id);

CREATE INDEX IF NOT EXISTS idx_student_study_progress_lesson
  ON public.student_study_progress USING btree (lesson_id);

-- ----------------------------------------------------------------
-- STEP 5: Enable RLS
-- ----------------------------------------------------------------
ALTER TABLE public.student_progress_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_study_progress ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- STEP 6: RLS Policies for student_progress_summary
-- ----------------------------------------------------------------

-- Students can view their own summary
DROP POLICY IF EXISTS "Students can view own progress summary" ON public.student_progress_summary;
CREATE POLICY "Students can view own progress summary"
  ON public.student_progress_summary FOR SELECT
  USING (auth.uid() = student_id);

-- Coaches can view their students' summaries
DROP POLICY IF EXISTS "Coaches can view student progress summaries" ON public.student_progress_summary;
CREATE POLICY "Coaches can view student progress summaries"
  ON public.student_progress_summary FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_students
      WHERE coach_id = auth.uid() AND student_id = public.student_progress_summary.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can update (via triggers/functions)
DROP POLICY IF EXISTS "System can update student progress summary" ON public.student_progress_summary;
CREATE POLICY "System can update student progress summary"
  ON public.student_progress_summary FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- ----------------------------------------------------------------
-- STEP 7: RLS Policies for student_achievements
-- ----------------------------------------------------------------

-- Students can view their own achievements
DROP POLICY IF EXISTS "Students can view own achievements" ON public.student_achievements;
CREATE POLICY "Students can view own achievements"
  ON public.student_achievements FOR SELECT
  USING (auth.uid() = student_id);

-- Coaches can view their students' achievements
DROP POLICY IF EXISTS "Coaches can view student achievements" ON public.student_achievements;
CREATE POLICY "Coaches can view student achievements"
  ON public.student_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_students
      WHERE coach_id = auth.uid() AND student_id = public.student_achievements.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Coaches can insert achievements for students
DROP POLICY IF EXISTS "Coaches can add achievements" ON public.student_achievements;
CREATE POLICY "Coaches can add achievements"
  ON public.student_achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_students
      WHERE coach_id = auth.uid() AND student_id = public.student_achievements.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- STEP 8: RLS Policies for student_study_progress
-- ----------------------------------------------------------------

-- Students can view their own study progress
DROP POLICY IF EXISTS "Students can view own study progress" ON public.student_study_progress;
CREATE POLICY "Students can view own study progress"
  ON public.student_study_progress FOR SELECT
  USING (auth.uid() = student_id);

-- Coaches can view their students' study progress
DROP POLICY IF EXISTS "Coaches can view student study progress" ON public.student_study_progress;
CREATE POLICY "Coaches can view student study progress"
  ON public.student_study_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_students
      WHERE coach_id = auth.uid() AND student_id = public.student_study_progress.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Students can update their own progress
DROP POLICY IF EXISTS "Students can update own study progress" ON public.student_study_progress;
CREATE POLICY "Students can update own study progress"
  ON public.student_study_progress FOR ALL
  USING (auth.uid() = student_id);

-- ----------------------------------------------------------------
-- STEP 9: Function to update student progress summary
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_student_progress(
  p_student_id UUID,
  p_points INTEGER DEFAULT 0,
  p_puzzles_solved INTEGER DEFAULT 0,
  p_studies_completed INTEGER DEFAULT 0,
  p_lessons_completed INTEGER DEFAULT 0,
  p_time_minutes INTEGER DEFAULT 0,
  p_study_chapters_completed INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_current_streak INTEGER;
BEGIN
  -- Insert or update the progress summary
  INSERT INTO public.student_progress_summary (
    student_id, total_points, puzzles_solved, studies_completed, 
    lessons_completed, total_time_minutes, current_streak_days, 
    longest_streak_days, last_activity_date, updated_at
  )
  VALUES (
    p_student_id, p_points, p_puzzles_solved, p_studies_completed,
    p_lessons_completed, p_time_minutes, 1, 1, v_today, now()
  )
  ON CONFLICT (student_id) DO UPDATE SET
    total_points = student_progress_summary.total_points + p_points,
    puzzles_solved = student_progress_summary.puzzles_solved + p_puzzles_solved,
    studies_completed = student_progress_summary.studies_completed + p_studies_completed,
    lessons_completed = student_progress_summary.lessons_completed + p_lessons_completed,
    total_time_minutes = student_progress_summary.total_time_minutes + p_time_minutes,
    last_activity_date = v_today,
    updated_at = now();
  
  -- Update streak logic
  UPDATE public.student_progress_summary
  SET 
    current_streak_days = CASE
      WHEN last_activity_date = v_yesterday THEN current_streak_days + 1
      WHEN last_activity_date = v_today THEN current_streak_days
      ELSE 1
    END,
    longest_streak_days = GREATEST(
      longest_streak_days,
      CASE
        WHEN last_activity_date = v_yesterday THEN current_streak_days + 1
        WHEN last_activity_date = v_today THEN current_streak_days
        ELSE 1
      END
    )
  WHERE student_id = p_student_id;
  
  -- Update level based on total points
  -- Level formula: level = floor(sqrt(total_points / 100)) + 1
  -- 0-99 = L1, 100-399 = L2, 400-899 = L3, etc.
  UPDATE public.student_progress_summary
  SET level = FLOOR(SQRT(total_points / 100.0))::INTEGER + 1
  WHERE student_id = p_student_id;
END;
$$;

-- ----------------------------------------------------------------
-- STEP 10: Function to award achievement
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_achievement(
  p_student_id UUID,
  p_achievement_key VARCHAR,
  p_achievement_name VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_icon VARCHAR DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only insert if not already earned
  INSERT INTO public.student_achievements (
    student_id, achievement_key, achievement_name, description, icon
  )
  VALUES (
    p_student_id, p_achievement_key, p_achievement_name, p_description, p_icon
  )
  ON CONFLICT (student_id, achievement_key) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------------
-- STEP 11: Auto-create progress summary for new students
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_student_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO public.student_progress_summary (student_id)
    VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_student_progress_on_signup ON public.profiles;
CREATE TRIGGER create_student_progress_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_student_created();