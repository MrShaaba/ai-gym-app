-- =============================================================================
-- Phase 8: Marketplace columns on profiles
-- Adds trainer-public fields for the Discover Trainers feature.
-- Run AFTER the base schema (schema.sql) and phase7c migrations.
-- =============================================================================

-- Add marketplace columns (idempotent with IF NOT EXISTS on each)
alter table public.profiles
  add column if not exists username         text unique,
  add column if not exists specialties      text[] default '{}',
  add column if not exists certifications   text[] default '{}',
  add column if not exists intro_video      text,
  add column if not exists experience_years integer default 0,
  add column if not exists is_public        boolean default false,
  add column if not exists rating_avg       numeric(3,2) default 0,
  add column if not exists rating_count     integer default 0;

-- Allow any authenticated user to read public trainer profiles
create policy "Anyone can read public trainer profiles"
  on public.profiles for select
  using (is_public = true and role = 'trainer');
