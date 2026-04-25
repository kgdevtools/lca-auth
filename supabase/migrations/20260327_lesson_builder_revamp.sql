-- ================================================================
-- Lesson Builder Revamp - Database Migration
-- Created: 2026-03-27
-- Description: Updates lessons table for block-based system, adds
--              lichess_puzzles table, and sets up RLS policies
--
-- HOW TO USE:
--   Copy and paste this entire file into the Supabase SQL Editor
--   and run it. Safe to run multiple times (uses IF NOT EXISTS).
-- ================================================================


-- ----------------------------------------------------------------
-- STEP 1: Create set_updated_at function if not exists
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------
-- STEP 2: Add blocks column to lessons table
-- ----------------------------------------------------------------
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.lessons.blocks IS 'Array of block objects for the new block-based lesson system';


-- ----------------------------------------------------------------
-- STEP 3: Update content_type check constraint to include 'block'
-- ----------------------------------------------------------------
ALTER TABLE public.lessons
DROP CONSTRAINT IF EXISTS lessons_content_type_check;

ALTER TABLE public.lessons
ADD CONSTRAINT lessons_content_type_check
CHECK (
  content_type = ANY (
    ARRAY[
      'text'::text,
      'video'::text,
      'quiz'::text,
      'puzzle'::text,
      'mixed'::text,
      'block'::text,
      'study'::text
    ]
  )
);


-- ----------------------------------------------------------------
-- STEP 4: Create lichess_puzzles table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lichess_puzzles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Lichess puzzle data
  puzzle_id    TEXT NOT NULL,
  rating       INTEGER,
  plays        INTEGER,
  solution     TEXT[],
  themes       TEXT[],
  initial_ply  INTEGER,

  -- Source game metadata
  game_id      TEXT,
  game_pgn     TEXT,
  game_clock   TEXT,
  game_rated   BOOLEAN,

  -- Human-readable context
  description  TEXT,

  -- Relationships
  coach_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.lichess_puzzles IS 'Stores Lichess puzzles assigned by coaches to students';


-- ----------------------------------------------------------------
-- STEP 5: Create indexes for lichess_puzzles
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lichess_puzzles_coach
  ON public.lichess_puzzles USING btree (coach_id);

CREATE INDEX IF NOT EXISTS idx_lichess_puzzles_student
  ON public.lichess_puzzles USING btree (student_id);

CREATE INDEX IF NOT EXISTS idx_lichess_puzzles_puzzle_id
  ON public.lichess_puzzles USING btree (puzzle_id);


-- ----------------------------------------------------------------
-- STEP 6: Add trigger for updated_at on lichess_puzzles
-- ----------------------------------------------------------------
CREATE TRIGGER lichess_puzzles_set_updated_at
  BEFORE UPDATE ON public.lichess_puzzles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ----------------------------------------------------------------
-- STEP 7: Enable RLS on lichess_puzzles
-- ----------------------------------------------------------------
ALTER TABLE public.lichess_puzzles ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- STEP 8: RLS Policies for lichess_puzzles
-- ----------------------------------------------------------------

-- Coaches can view their own puzzles
DROP POLICY IF EXISTS "Coaches can view own puzzles" ON public.lichess_puzzles;
CREATE POLICY "Coaches can view own puzzles"
  ON public.lichess_puzzles FOR SELECT
  USING (auth.uid() = coach_id);

-- Coaches can insert puzzles
DROP POLICY IF EXISTS "Coaches can insert puzzles" ON public.lichess_puzzles;
CREATE POLICY "Coaches can insert puzzles"
  ON public.lichess_puzzles FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can update their own puzzles
DROP POLICY IF EXISTS "Coaches can update own puzzles" ON public.lichess_puzzles;
CREATE POLICY "Coaches can update own puzzles"
  ON public.lichess_puzzles FOR UPDATE
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can delete their own puzzles
DROP POLICY IF EXISTS "Coaches can delete own puzzles" ON public.lichess_puzzles;
CREATE POLICY "Coaches can delete own puzzles"
  ON public.lichess_puzzles FOR DELETE
  USING (auth.uid() = coach_id);

-- Students can view their assigned puzzles
DROP POLICY IF EXISTS "Students can view assigned puzzles" ON public.lichess_puzzles;
CREATE POLICY "Students can view assigned puzzles"
  ON public.lichess_puzzles FOR SELECT
  USING (auth.uid() = student_id);


-- ----------------------------------------------------------------
-- STEP 9: Update RLS on lessons table (if not already enabled)
-- ----------------------------------------------------------------
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- STEP 10: RLS Policies for lessons
-- ----------------------------------------------------------------

-- Anyone can view published lessons
DROP POLICY IF EXISTS "Anyone can view published lessons" ON public.lessons;
CREATE POLICY "Anyone can view published lessons"
  ON public.lessons FOR SELECT
  USING (published = true);

-- Coaches can view all lessons (published and draft)
DROP POLICY IF EXISTS "Coaches can view all lessons" ON public.lessons;
CREATE POLICY "Coaches can view all lessons"
  ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can insert lessons
DROP POLICY IF EXISTS "Coaches can insert lessons" ON public.lessons;
CREATE POLICY "Coaches can insert lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can update lessons
DROP POLICY IF EXISTS "Coaches can update lessons" ON public.lessons;
CREATE POLICY "Coaches can update lessons"
  ON public.lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Only admins can delete lessons
DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;
CREATE POLICY "Admins can delete lessons"
  ON public.lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ----------------------------------------------------------------
-- STEP 11: Update RLS on lesson_categories table
-- ----------------------------------------------------------------
ALTER TABLE public.lesson_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.lesson_categories;
CREATE POLICY "Anyone can view categories"
  ON public.lesson_categories FOR SELECT
  USING (true);

-- Coaches can insert categories
DROP POLICY IF EXISTS "Coaches can insert categories" ON public.lesson_categories;
CREATE POLICY "Coaches can insert categories"
  ON public.lesson_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can update categories
DROP POLICY IF EXISTS "Coaches can update categories" ON public.lesson_categories;
CREATE POLICY "Coaches can update categories"
  ON public.lesson_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Admins can delete categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.lesson_categories;
CREATE POLICY "Admins can delete categories"
  ON public.lesson_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ----------------------------------------------------------------
-- STEP 12: Update RLS on lesson_progress table
-- ----------------------------------------------------------------
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own progress
DROP POLICY IF EXISTS "Students can view own progress" ON public.lesson_progress;
CREATE POLICY "Students can view own progress"
  ON public.lesson_progress FOR SELECT
  USING (auth.uid() = student_id);

-- Coaches can view their students' progress
DROP POLICY IF EXISTS "Coaches can view student progress" ON public.lesson_progress;
CREATE POLICY "Coaches can view student progress"
  ON public.lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.id = p2.id
      WHERE p1.id = auth.uid() AND p1.role IN ('coach', 'admin')
    )
  );

-- Students can insert their own progress
DROP POLICY IF EXISTS "Students can insert own progress" ON public.lesson_progress;
CREATE POLICY "Students can insert own progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own progress
DROP POLICY IF EXISTS "Students can update own progress" ON public.lesson_progress;
CREATE POLICY "Students can update own progress"
  ON public.lesson_progress FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);


-- ----------------------------------------------------------------
-- VERIFICATION
-- After running, verify with:
--
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('lessons', 'lichess_puzzles', 'lesson_progress', 'lesson_categories')
-- ORDER BY table_name, ordinal_position;
-- ================================================================