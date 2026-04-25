-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add coach_name to coach_students
--
-- Rationale: avoids a second profiles JOIN when a student reads their own
-- coach_students row (RLS on profiles can block cross-user reads).
-- coach_name is kept in sync by two triggers:
--   1. trg_sync_coach_name_on_assign   — fires on INSERT / coach_id UPDATE
--   2. trg_sync_coach_name_on_profile  — fires when profiles.full_name changes
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: add the column -------------------------------------------------
ALTER TABLE public.coach_students
  ADD COLUMN IF NOT EXISTS coach_name text;

-- Step 2: backfill existing rows -----------------------------------------
UPDATE public.coach_students cs
SET    coach_name = p.full_name
FROM   public.profiles p
WHERE  p.id = cs.coach_id;

-- Step 3: trigger — keep coach_name current when a row is inserted or
--         when coach_id is reassigned ----------------------------------------
CREATE OR REPLACE FUNCTION public.sync_coach_name_on_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT full_name
  INTO   NEW.coach_name
  FROM   public.profiles
  WHERE  id = NEW.coach_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_coach_name_on_assign ON public.coach_students;
CREATE TRIGGER trg_sync_coach_name_on_assign
  BEFORE INSERT OR UPDATE OF coach_id ON public.coach_students
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_coach_name_on_assign();

-- Step 4: trigger — propagate profile name changes to all linked rows --------
CREATE OR REPLACE FUNCTION public.sync_coach_name_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    UPDATE public.coach_students
    SET    coach_name = NEW.full_name
    WHERE  coach_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_coach_name_on_profile ON public.profiles;
CREATE TRIGGER trg_sync_coach_name_on_profile
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_coach_name_on_profile_update();
