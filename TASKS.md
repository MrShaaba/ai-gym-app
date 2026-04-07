# Tasks

## Phase 1 — Foundation ✅

- [x] Project scaffold (Expo SDK 54, TypeScript, path aliases)
- [x] Theme system (dark mode tokens, spacing, typography)
- [x] Type definitions (User, Workout domain models)
- [x] Shared UI components (Screen, Button, Card, Input)
- [x] Zustand auth store (role-based, mock login/logout)
- [x] Secure storage service wrapper
- [x] File-based routing (expo-router, 4 route groups)
- [x] Auth flow screens (onboarding, login, register, OTP, biometric)
- [x] Client screens (workout, programs, statistics, profile)
- [x] Trainer screens (dashboard, clients, programs, profile)
- [x] Shared screens (subscription paywall, settings)
- [x] Documentation (README, architecture, PRD, roadmap)

## Phase 2 — Supabase Integration ✅

- [x] Supabase project setup (fcsllrdvsizlrrqatgeq)
- [x] Auth integration (email/password, OTP, session restore)
- [x] Database schema (profiles, trainer_client_links, programs, routines, assignments, completed_workouts)
- [x] RLS policies (row-level security for all tables)
- [x] Profile auto-creation trigger
- [x] Service layer (auth, profiles, programs, workouts, assignments)

## Phase 3 — Workout Engine ✅

- [x] Zustand workoutStore (persisted, active session, history)
- [x] Live workout screen (exercise tracking, set logging)
- [x] Rest timer with countdown
- [x] Workout completion & history persistence
- [x] Exercise detail modal

## Phase 4 — Trainer-Client System ✅

- [x] Zustand assignmentStore (persisted, notifications)
- [x] Trainer client management (link, view, assign)
- [x] Assignment creation with schedule days
- [x] Client notification system
- [x] Trainer dashboard with stats grid

## Phase 5 — Marketplace ✅

- [x] Discover Trainers screen (search, specialty filter)
- [x] Trainer public profile types
- [x] useTrainerSearch hook
- [x] Filter chip UI component
- [x] Migration: marketplace columns on profiles (written, pending deploy)

## Phase 6 — Programs & Routines ✅

- [x] Program list screen with drill-down
- [x] Routine detail with exercise list
- [x] Create program flow (trainer)
- [x] Routine assignment to clients

## Phase 7 — AI Generation ✅

- [x] 7A: Generate workout screen (goal, equipment, duration inputs)
- [x] 7B: Review plan screen (accept/edit/regenerate)
- [x] 7C: Edge Function for OpenAI generation (written, pending deploy)
- [x] Migration: AI generation columns (written, pending deploy)
- [x] Programs service: createFromAI, endorsePlan

## Phase 8 — Bug Fixes & Polish (Current) 🔄

- [x] P0: Fix duplicate React key crash in workout.tsx
- [x] P1: Interactive day picker (tap to select day, filter routines)
- [x] P2: Fix session staleness (reset stores before hydration on sign-in)
- [x] P3: Discover filter chip visual polish
- [x] Marketplace migration SQL
- [x] Deploy runbook (migrations, Edge Function, secrets)
- [x] Documentation sync (AGENTS.md, TASKS.md, architecture.md)

## Phase 9 — Future

- [ ] Deploy Phase 7C + 8 migrations to Supabase
- [ ] Set OPENAI_API_KEY secret on Supabase
- [ ] Deploy generate-plan Edge Function
- [ ] Real-device end-to-end testing
- [ ] Push notifications
- [ ] Analytics & crash reporting
- [ ] App Store / Play Store submission