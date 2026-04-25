-- ================================================================
-- Lesson Students Assignment - Database Migration
-- Created: 2026-04-01
-- Description: Creates lesson_students junction table to assign
--              students to lessons, and adds RLS policies for
--              student access to assigned lessons.
--
-- HOW TO USE:
--   Copy and paste this entire file into the Supabase SQL Editor
--   and run it. Safe to run multiple times (uses IF NOT EXISTS).
-- ================================================================


-- ----------------------------------------------------------------
-- STEP 1: Create lesson_students junction table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Prevent duplicate assignments
  CONSTRAINT lesson_students_lesson_id_student_id_key UNIQUE (lesson_id, student_id)
);

COMMENT ON TABLE public.lesson_students IS 'Junction table linking lessons to assigned students';


-- ----------------------------------------------------------------
-- STEP 2: Create indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lesson_students_lesson
  ON public.lesson_students USING btree (lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_students_student
  ON public.lesson_students USING btree (student_id);


-- ----------------------------------------------------------------
-- STEP 3: Enable RLS
-- ----------------------------------------------------------------
ALTER TABLE public.lesson_students ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- STEP 4: RLS Policies for lesson_students
-- ----------------------------------------------------------------

-- Coaches/admins can view all assignments
DROP POLICY IF EXISTS "Coaches can view lesson assignments" ON public.lesson_students;
CREATE POLICY "Coaches can view lesson assignments"
  ON public.lesson_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches/admins can insert assignments
DROP POLICY IF EXISTS "Coaches can assign students" ON public.lesson_students;
CREATE POLICY "Coaches can assign students"
  ON public.lesson_students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches/admins can delete assignments
DROP POLICY IF EXISTS "Coaches can unassign students" ON public.lesson_students;
CREATE POLICY "Coaches can unassign students"
  ON public.lesson_students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Students can view their own assignments
DROP POLICY IF EXISTS "Students can view own lesson assignments" ON public.lesson_students;
CREATE POLICY "Students can view own lesson assignments"
  ON public.lesson_students FOR SELECT
  USING (auth.uid() = student_id);


-- ----------------------------------------------------------------
-- STEP 5: Update RLS on lessons to allow student access
-- ----------------------------------------------------------------

-- Students can view lessons assigned to them
DROP POLICY IF EXISTS "Students can view assigned lessons" ON public.lessons;
CREATE POLICY "Students can view assigned lessons"
  ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lesson_students
      WHERE lesson_id = public.lessons.id
        AND student_id = auth.uid()
    )
  );
