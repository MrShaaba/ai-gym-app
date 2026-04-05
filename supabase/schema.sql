-- =============================================================================
-- AI Gym — Supabase Schema
-- Phase 5: Core tables, RLS policies, and trigger for profile auto-creation
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)
-- =============================================================================

-- 1. Profiles (extends auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'client' check (role in ('client', 'trainer')),
  full_name   text not null default '',
  avatar_url  text,
  goal        text,          -- client-specific
  bio         text,          -- trainer-specific
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile (for signup)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trainers can read profiles of their linked clients
create policy "Trainers can read linked client profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.trainer_client_links
      where trainer_id = auth.uid() and client_id = profiles.id and status = 'active'
    )
  );

-- 2. Trainer ↔ Client Links
-- =============================================================================
create table if not exists public.trainer_client_links (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles(id) on delete cascade,
  client_id   uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at  timestamptz not null default now(),
  unique (trainer_id, client_id)
);

alter table public.trainer_client_links enable row level security;

create policy "Trainers manage own links"
  on public.trainer_client_links for all
  using (trainer_id = auth.uid());

create policy "Clients can read own links"
  on public.trainer_client_links for select
  using (client_id = auth.uid());

-- 3. Programs
-- =============================================================================
create table if not exists public.programs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  difficulty    text not null default 'intermediate' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  days_per_week int not null default 3,
  created_by    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.programs enable row level security;

create policy "Creator manages own programs"
  on public.programs for all
  using (created_by = auth.uid());

create policy "Linked clients can read programs"
  on public.programs for select
  using (
    exists (
      select 1 from public.trainer_client_links
      where client_id = auth.uid() and trainer_id = programs.created_by and status = 'active'
    )
  );

-- 4. Routines
-- =============================================================================
create table if not exists public.routines (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid references public.programs(id) on delete cascade,
  name             text not null,
  difficulty       text not null default 'intermediate' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_minutes int,
  exercises_json   jsonb not null default '[]'::jsonb,   -- WorkoutExercise[] stored as JSON
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.routines enable row level security;

create policy "Program owner manages routines"
  on public.routines for all
  using (
    exists (
      select 1 from public.programs where id = routines.program_id and created_by = auth.uid()
    )
  );

create policy "Linked clients can read routines"
  on public.routines for select
  using (
    exists (
      select 1 from public.programs p
      join public.trainer_client_links l on l.trainer_id = p.created_by
      where p.id = routines.program_id and l.client_id = auth.uid() and l.status = 'active'
    )
  );

-- 5. Assignments
-- =============================================================================
create table if not exists public.assignments (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null references public.profiles(id) on delete cascade,
  client_id     uuid not null references public.profiles(id) on delete cascade,
  routine_id    uuid references public.routines(id) on delete set null,
  routine_name  text not null,
  program_name  text,
  schedule_days text[] not null default '{}',   -- e.g. {'Mon','Wed','Fri'}
  status        text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed')),
  note          text,
  assigned_at   timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

alter table public.assignments enable row level security;

create policy "Trainers manage own assignments"
  on public.assignments for all
  using (trainer_id = auth.uid());

create policy "Clients read own assignments"
  on public.assignments for select
  using (client_id = auth.uid());

create policy "Clients update own assignment status"
  on public.assignments for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- 6. Completed Workouts
-- =============================================================================
create table if not exists public.completed_workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  routine_id       text,                     -- local routine id reference
  routine_name     text not null,
  started_at       timestamptz not null,
  completed_at     timestamptz not null,
  duration_seconds int not null default 0,
  total_volume     real not null default 0,
  total_sets       int not null default 0,
  total_reps       int not null default 0,
  exercises_json   jsonb not null default '[]'::jsonb,  -- ExerciseLog[]
  created_at       timestamptz not null default now()
);

alter table public.completed_workouts enable row level security;

create policy "Users manage own workouts"
  on public.completed_workouts for all
  using (user_id = auth.uid());

create policy "Trainers read linked client workouts"
  on public.completed_workouts for select
  using (
    exists (
      select 1 from public.trainer_client_links
      where trainer_id = auth.uid()
        and client_id = completed_workouts.user_id
        and status = 'active'
    )
  );

-- =============================================================================
-- Auto-create profile on signup (trigger)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
