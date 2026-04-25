-- ================================================================
-- Revoke Lesson Points - Database Migration
-- Created: 2026-04-20
-- Description: Adds a function to clean up points_transactions and
--              recalculate student_progress_summary when a lesson
--              is deleted. Called via RPC before deleting a lesson.
--
-- HOW TO USE:
--   Paste into Supabase SQL Editor and run.
--   Safe to re-run (CREATE OR REPLACE).
-- ================================================================

CREATE OR REPLACE FUNCTION public.revoke_lesson_points(p_lesson_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id        UUID;
  v_new_total         INTEGER;
  v_lesson_completions INTEGER;
BEGIN
  FOR v_student_id IN
    SELECT DISTINCT student_id
    FROM public.points_transactions
    WHERE reference_id = p_lesson_id
  LOOP
    -- Count lesson-completion transactions before deleting
    SELECT COUNT(*) INTO v_lesson_completions
    FROM public.points_transactions
    WHERE student_id   = v_student_id
      AND reference_id = p_lesson_id
      AND action_type IN ('lesson_complete_puzzle', 'lesson_complete_study');

    -- Remove all point transactions tied to this lesson
    DELETE FROM public.points_transactions
    WHERE student_id   = v_student_id
      AND reference_id = p_lesson_id;

    -- Recalculate total_points from remaining transactions
    SELECT COALESCE(SUM(points), 0) INTO v_new_total
    FROM public.points_transactions
    WHERE student_id = v_student_id;

    -- Update summary: recalculate points + level, decrement lesson counter
    UPDATE public.student_progress_summary
    SET
      total_points      = v_new_total,
      level             = FLOOR(SQRT(v_new_total / 100.0))::INTEGER + 1,
      lessons_completed = GREATEST(0, lessons_completed - v_lesson_completions),
      updated_at        = now()
    WHERE student_id = v_student_id;
  END LOOP;
END;
$$;
