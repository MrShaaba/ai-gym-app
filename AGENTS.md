# Agent Instructions — AI Gym App

## Project Context

This is an Expo React Native TypeScript mobile app for AI-assisted gym training. It uses file-based routing via expo-router with role-aware navigation (client vs trainer). Backend is Supabase (Postgres, Auth, Edge Functions, Realtime).

## Architecture Rules

- **Expo managed workflow** — no native code modifications
- **expo-router** — all screens live in `app/` as file routes
- **Zustand** — 3 stores: authStore (session/profile), workoutStore (persisted), assignmentStore (persisted)
- **Supabase** — auth, database, Edge Functions (Deno), Realtime subscriptions
- **Dark theme** — all screens use tokens from `config/theme.ts`
- **Path aliases** — use `@/` prefix (maps to project root)
- **Package manager** — Yarn 4.4.1

## Conventions

- Components use `StyleSheet.create()`, no inline styles
- Shared UI in `components/ui/`, composed into screens
- Type definitions in `types/`, one file per domain
- Services in `services/`, one file per Supabase table/domain
- Use `colors.danger` (NOT `colors.error`) and `colors.background` (NOT `colors.surfaceAlt`)
- No `any` types — use proper interfaces from `types/`
- Zustand selectors must be atomic (one field per selector) to avoid infinite re-renders
- Exclude `supabase/functions/` from tsconfig (Deno runtime, not Node)

## Route Groups

| Group | Role | Layout | Purpose |
|-------|------|--------|---------|
| `(auth)` | All | Stack | Onboarding, login, registration, OTP |
| `(client)` | Client | Tabs | Workout, programs, stats, profile, discover, generate |
| `(trainer)` | Trainer | Tabs | Dashboard, clients, programs, profile, assign |
| `(shared)` | All | Stack (modal) | Settings |
| `(workout)` | Client | Stack | Active workout session, exercise detail, rest timer |

## Store Architecture

| Store | Persisted | Storage Key | Purpose |
|-------|-----------|-------------|---------|
| authStore | No | — | Session, profile, role, loading |
| workoutStore | Yes | `workout-storage` | Active session, history, rest timer |
| assignmentStore | Yes | `assignment-storage` | Assignments, notifications, hydration |

## Schema (6 tables live)

profiles, trainer_client_links, programs, routines, assignments, completed_workouts

## Do NOT

- Use `colors.error` or `colors.surfaceAlt` — they don't exist
- Add inline Zustand selectors that return objects (causes re-render loops)
- Modify `App.tsx` (unused, expo-router handles entry)
- Run `tsc` on `supabase/functions/` (Deno, not Node)