-- ================================================================
-- Lessons: denormalize creator_name + creator_role
-- Created: 2026-04-20
--
-- Rationale: profiles RLS blocks cross-user reads, so students
-- can't resolve lesson creator names via a JOIN. Store them
-- directly on lessons and keep them in sync via triggers —
-- same pattern as coach_name on coach_students.
-- ================================================================

-- Step 1: add columns ------------------------------------------------
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS creator_name TEXT,
  ADD COLUMN IF NOT EXISTS creator_role TEXT;

-- Step 2: backfill existing rows ------------------------------------
UPDATE public.lessons l
SET creator_name = p.full_name,
    creator_role = p.role
FROM public.profiles p
WHERE p.id = l.created_by;

-- Step 3: trigger — populate on INSERT or when created_by changes ---
CREATE OR REPLACE FUNCTION public.sync_lesson_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    SELECT full_name, role
    INTO   NEW.creator_name, NEW.creator_role
    FROM   public.profiles
    WHERE  id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lesson_creator ON public.lessons;
CREATE TRIGGER trg_sync_lesson_creator
  BEFORE INSERT OR UPDATE OF created_by ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lesson_creator();

-- Step 4: trigger — propagate profile name/role changes to lessons --
CREATE OR REPLACE FUNCTION public.sync_lesson_creator_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name
  OR OLD.role      IS DISTINCT FROM NEW.role
  THEN
    UPDATE public.lessons
    SET creator_name = NEW.full_name,
        creator_role = NEW.role
    WHERE created_by = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lesson_creator_on_profile ON public.profiles;
CREATE TRIGGER trg_sync_lesson_creator_on_profile
  AFTER UPDATE OF full_name, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lesson_creator_on_profile_update();
