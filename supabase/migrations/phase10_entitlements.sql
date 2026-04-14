-- Phase 10: Minimal entitlement fields on profiles for trial/premium readiness

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_override boolean DEFAULT false;

UPDATE public.profiles
SET
  plan_tier = COALESCE(plan_tier, 'free'),
  admin_override = COALESCE(admin_override, false)
WHERE plan_tier IS NULL OR admin_override IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN plan_tier SET DEFAULT 'free',
  ALTER COLUMN plan_tier SET NOT NULL,
  ALTER COLUMN admin_override SET DEFAULT false,
  ALTER COLUMN admin_override SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_plan_tier_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_tier_check
      CHECK (plan_tier IN ('free', 'premium'));
  END IF;
END $$;