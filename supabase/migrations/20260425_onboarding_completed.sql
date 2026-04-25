ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Mark existing users who have already set a display name as having completed onboarding
UPDATE public.profiles
SET onboarding_completed = true
WHERE full_name IS NOT NULL AND full_name != '';
