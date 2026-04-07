-- =============================================================================
-- Phase 7C hosted repair
--
-- Purpose:
-- 1. Apply the missing AI generation schema required by Phase 7C.
-- 2. Harden profile defaults + signup trigger so auth.signUp does not fail when
--    the live profiles table contains newer marketplace / AI columns.
--
-- Safe to run multiple times.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Marketplace/profile columns used by the live project
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS intro_video text,
  ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_avg real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_generation_count integer DEFAULT 0;

UPDATE public.profiles
SET
  username = NULLIF(lower(username), ''),
  specialties = COALESCE(specialties, '{}'::text[]),
  certifications = COALESCE(certifications, '{}'::text[]),
  experience_years = COALESCE(experience_years, 0),
  is_public = COALESCE(is_public, false),
  rating_avg = COALESCE(rating_avg, 0),
  rating_count = COALESCE(rating_count, 0),
  ai_generation_count = COALESCE(ai_generation_count, 0)
WHERE
  username IS DISTINCT FROM NULLIF(lower(username), '')
  OR specialties IS NULL
  OR certifications IS NULL
  OR experience_years IS NULL
  OR is_public IS NULL
  OR rating_avg IS NULL
  OR rating_count IS NULL
  OR ai_generation_count IS NULL;

UPDATE public.profiles
SET username = NULL
WHERE username IS NOT NULL
  AND username !~ '^[a-z][a-z0-9_]{2,19}$';

ALTER TABLE public.profiles
  ALTER COLUMN specialties SET DEFAULT '{}'::text[],
  ALTER COLUMN specialties SET NOT NULL,
  ALTER COLUMN certifications SET DEFAULT '{}'::text[],
  ALTER COLUMN certifications SET NOT NULL,
  ALTER COLUMN experience_years SET DEFAULT 0,
  ALTER COLUMN experience_years SET NOT NULL,
  ALTER COLUMN is_public SET DEFAULT false,
  ALTER COLUMN is_public SET NOT NULL,
  ALTER COLUMN rating_avg SET DEFAULT 0,
  ALTER COLUMN rating_avg SET NOT NULL,
  ALTER COLUMN rating_count SET DEFAULT 0,
  ALTER COLUMN rating_count SET NOT NULL,
  ALTER COLUMN ai_generation_count SET DEFAULT 0,
  ALTER COLUMN ai_generation_count SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (username)
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS username_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT username_format
  CHECK (username IS NULL OR username ~ '^[a-z][a-z0-9_]{2,19}$');

-- -----------------------------------------------------------------------------
-- 2) Phase 7C program columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS generation_metadata jsonb,
  ADD COLUMN IF NOT EXISTS trainer_endorsed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS trainer_endorsed_at timestamptz;

UPDATE public.programs
SET source = COALESCE(source, 'client')
WHERE source IS NULL;

ALTER TABLE public.programs
  ALTER COLUMN source SET DEFAULT 'client',
  ALTER COLUMN source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'programs_source_check'
      AND conrelid = 'public.programs'::regclass
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_source_check
      CHECK (source IN ('client', 'trainer', 'ai', 'ai_endorsed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'programs'
      AND policyname = 'Trainers can read linked client programs'
  ) THEN
    CREATE POLICY "Trainers can read linked client programs"
      ON public.programs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.trainer_client_links
          WHERE trainer_id = auth.uid()
            AND client_id = programs.created_by
            AND status = 'active'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'programs'
      AND policyname = 'Trainers can endorse linked client AI programs'
  ) THEN
    CREATE POLICY "Trainers can endorse linked client AI programs"
      ON public.programs
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.trainer_client_links
          WHERE trainer_id = auth.uid()
            AND client_id = programs.created_by
            AND status = 'active'
        )
        AND source IN ('ai', 'ai_endorsed')
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.trainer_client_links
          WHERE trainer_id = auth.uid()
            AND client_id = programs.created_by
            AND status = 'active'
        )
        AND source = 'ai_endorsed'
        AND trainer_endorsed_by = auth.uid()
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) RPC used by the generate-plan Edge Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_ai_generation_count(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET ai_generation_count = ai_generation_count + 1
  WHERE id = user_id;
$$;

-- -----------------------------------------------------------------------------
-- 4) Harden signup trigger against live schema drift
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    avatar_url,
    goal,
    bio,
    username,
    specialties,
    certifications,
    intro_video,
    experience_years,
    is_public,
    rating_avg,
    rating_count,
    ai_generation_count
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'role', 'client'),
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    NULL,
    NULL,
    NULL,
    CASE
      WHEN NULLIF(lower(COALESCE(new.raw_user_meta_data ->> 'username', '')), '') ~ '^[a-z][a-z0-9_]{2,19}$'
        THEN NULLIF(lower(COALESCE(new.raw_user_meta_data ->> 'username', '')), '')
      ELSE NULL
    END,
    '{}'::text[],
    '{}'::text[],
    NULL,
    0,
    false,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5) Repair invite auto-link trigger so signup does not depend on profiles.email
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_email text;
  v_username text;
  v_invite RECORD;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.id;

  v_username := NEW.username;

  FOR v_invite IN
    SELECT *
    FROM public.invites
    WHERE status = 'pending'
      AND (
        (v_email IS NOT NULL AND lower(invite_value) = lower(v_email))
        OR (v_username IS NOT NULL AND lower(invite_value) = lower(v_username))
      )
  LOOP
    INSERT INTO public.trainer_client_links (trainer_id, client_id, status)
    VALUES (v_invite.trainer_id, NEW.id, 'active')
    ON CONFLICT (trainer_id, client_id) DO UPDATE SET status = 'active';

    UPDATE public.invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invite.id;
  END LOOP;

  RETURN NEW;
END;
$function$;