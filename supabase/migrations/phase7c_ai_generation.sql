-- =============================================================================
-- Phase 7C: AI Generation — Schema additions
-- Run in Supabase SQL Editor (Dashboard → SQL → New Query)
-- =============================================================================

-- 1. programs: add source, generation_metadata, trainer endorsement
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'client'
    CHECK (source IN ('client', 'trainer', 'ai', 'ai_endorsed')),
  ADD COLUMN IF NOT EXISTS generation_metadata jsonb,
  ADD COLUMN IF NOT EXISTS trainer_endorsed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS trainer_endorsed_at timestamptz;

-- 2. profiles: track free AI generation usage
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_generation_count integer NOT NULL DEFAULT 0;

-- 3. Increment generation count (called after successful generation)
CREATE OR REPLACE FUNCTION public.increment_ai_generation_count(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.profiles
  SET ai_generation_count = ai_generation_count + 1
  WHERE id = user_id;
$$;
