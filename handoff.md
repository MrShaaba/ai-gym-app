# Handoff — AI Gym App

> **For:** Cline (implementation agent)
> **From:** Copilot (VS Code agent, Claude Opus 4.6)
> **Date:** 2025-07-15
> **Repo root:** `/Users/bellomohammed/Dev/experiments/ai-gym-app`

---

## 1. Executive Summary

AI Gym is a React Native (Expo SDK 54) fitness app targeting two user roles: **clients** (gym-goers) and **trainers** (coaches managing multiple clients). It combines AI-generated workout programming with real trainer oversight. The app is part of a broader "app factory" strategy — the owner builds portfolio-quality products to demonstrate full-stack, AI-integrated mobile engineering.

**Current state:** The app shell is feature-complete through Phase 7C. Auth (Supabase email/password), role-based routing, workout logging, trainer-client linking, program management, assignment flow, marketplace discovery, real-time subscriptions, and AI plan generation UI are all coded. TypeScript compiles with **zero errors**.

**What's deployed:** Supabase project exists (`fcsllrdvsizlrrqatgeq`). Base schema (6 tables) is live. Phase 7C migration SQL and Edge Function are written but **NOT yet applied/deployed**.

**Revenue model:** Freemium. 3 free AI generations, then subscription unlock (RevenueCat, Phase 4). Trainer marketplace with reviews, ratings, and profile discovery.

---

## 2. Stack & Tooling

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Expo (managed) | SDK 54 | New architecture enabled |
| UI | React Native | 0.81.5 | No native modules |
| Language | TypeScript | 5.9.2 | Strict mode, tsc clean |
| Routing | expo-router | 6.0.23 | File-based, 5 route groups |
| State | Zustand | 5.0.12 | 3 stores |
| Backend | Supabase | JS v2.101.1 | Auth, Postgres, Edge Functions, Realtime |
| AI | OpenAI gpt-4o-mini | — | Via Supabase Edge Function only |
| Storage | AsyncStorage | 2.2.0 | Zustand persistence |
| Secure Storage | expo-secure-store | ~15.0.8 | Not actively used post-Supabase migration |
| Package Manager | Yarn | 4.4.1 | PnP not enabled, classic node_modules |

**No ESLint, Prettier, or test runner configured.**

### Key commands

```bash
npx expo start          # Dev server (Expo Go or dev client)
npx tsc --noEmit        # Type check (currently 0 errors)
yarn install            # Install dependencies
```

---

## 3. Project Structure

```
ai-gym-app/
├── app/                        # expo-router file-based screens
│   ├── _layout.tsx             # Root Stack (providers, StatusBar)
│   ├── index.tsx               # Entry redirect: loading → onboarding → auth → role
│   ├── +not-found.tsx          # 404 fallback
│   ├── (auth)/                 # Headerless Stack
│   │   ├── onboarding.tsx      # Swipe intro → login
│   │   ├── login.tsx           # Email/password + social placeholders
│   │   ├── register.tsx        # Name, email, password, role picker
│   │   ├── otp-verify.tsx      # STUB — 6-digit code
│   │   └── biometric-setup.tsx # Face ID opt-in
│   ├── (client)/               # Bottom Tabs (4 visible + 2 hidden)
│   │   ├── workout.tsx         # Weekly calendar, assigned routines, "Generate" CTA
│   │   ├── programs.tsx        # Program list, AI/endorsed badges, "AI Builder" button
│   │   ├── statistics.tsx      # PLACEHOLDER — stat cards
│   │   ├── profile.tsx         # Measurements, avatar, sign-out
│   │   ├── generate.tsx        # HIDDEN TAB — AI generation form
│   │   ├── review-plan.tsx     # HIDDEN TAB — review generated plan, save/regenerate
│   │   ├── discover.tsx        # Marketplace trainer search
│   │   ├── trainer-profile.tsx # View trainer detail, request link
│   │   ├── create-program.tsx  # STUB — client program creation
│   │   └── schedule.tsx        # STUB — schedule view
│   ├── (trainer)/              # Bottom Tabs (4 tabs)
│   │   ├── dashboard.tsx       # Stats grid, today-at-a-glance
│   │   ├── clients.tsx         # Client list (active/pending/inactive)
│   │   ├── programs.tsx        # Program CRUD, routine management
│   │   ├── profile.tsx         # Trainer profile, sign-out
│   │   ├── client-detail.tsx   # HIDDEN — view client, assignments, AI endorsement
│   │   ├── assign.tsx          # HIDDEN — assign routine to client
│   │   ├── create-routine.tsx  # HIDDEN — build routine with exercises
│   │   ├── program-detail.tsx  # HIDDEN — view/edit program routines
│   │   ├── edit-profile.tsx    # HIDDEN — edit trainer profile fields
│   │   └── invite-client.tsx   # HIDDEN — invite via email
│   ├── (workout)/              # Stack (push from client tabs)
│   │   ├── session.tsx         # Live workout session, set logging, rest timer
│   │   └── summary.tsx         # Post-workout summary, save to Supabase
│   └── (shared)/               # Modal Stack
│       ├── subscription.tsx    # Paywall placeholder
│       └── settings.tsx        # Preferences, sign-out
├── components/
│   ├── ui/                     # Shared primitives
│   │   ├── Screen.tsx          # SafeArea + ScrollView wrapper
│   │   ├── Button.tsx          # Primary/secondary/outline variants
│   │   ├── Card.tsx            # Surface card with optional press
│   │   ├── Input.tsx           # Text input with label, error
│   │   ├── Badge.tsx           # Colored pill badge
│   │   ├── DayPicker.tsx       # Multi-select day-of-week
│   │   └── PremiumGate.tsx     # Lock overlay when free limit hit
│   ├── navigation/
│   │   └── TabBarIcon.tsx      # Ionicons tab icon
│   └── workout/
│       ├── ExerciseCard.tsx    # Exercise display in session
│       ├── SetRow.tsx          # Reps × weight row
│       ├── ProgressBar.tsx     # Visual progress ring/bar
│       └── RestTimer.tsx       # Countdown rest timer
├── config/
│   ├── theme.ts               # Dark theme tokens (colors, spacing, fontSize, borderRadius)
│   ├── constants.ts           # Feature flags, FREE_AI_GENERATION_LIMIT=3
│   └── supabase.ts            # createClient with AsyncStorage adapter
├── data/
│   ├── exercises.ts           # 27 exercise objects (name, muscle, equipment, instructions)
│   ├── clients.ts             # 5 mock clients (for trainer views before real data)
│   └── routines.ts            # 5 mock routines (for demo/fallback)
├── hooks/
│   ├── useSession.ts          # Bootstrap auth: restore session, fetch profile, hydrate stores
│   ├── useUserId.ts           # Convenience: extract user.id from authStore
│   ├── usePrograms.ts         # Fetch programs for current user
│   ├── useRoutines.ts         # Fetch routines for a program
│   ├── useTrainerClients.ts   # Fetch trainer's linked clients
│   ├── useTrainerSearch.ts    # Search public trainers (marketplace)
│   ├── useReviews.ts          # Fetch/submit trainer reviews
│   ├── useRealtime.ts         # Supabase realtime subscription (assignments)
│   └── usePremiumGate.ts      # AI generation usage tracking
├── services/
│   ├── auth.ts                # signIn, signUp, signOut, onAuthStateChange
│   ├── profiles.ts            # getProfile, updateProfile (Profile type defined here)
│   ├── programs.ts            # CRUD programs, saveGeneratedPlan, endorseProgram
│   ├── workouts.ts            # saveCompletedWorkout, fetchWorkoutHistory
│   ├── assignments.ts         # CRUD assignments, updateStatus
│   ├── trainer.ts             # inviteClient, fetchTrainerDashboardStats
│   ├── marketplace.ts         # searchTrainers, checkUsername, setUsername, reviews
│   ├── generation.ts          # generatePlan (calls Edge Function), getGenerationCount
│   └── storage.ts             # get/set/remove from SecureStore
├── store/
│   ├── authStore.ts           # NOT persisted — session, user, profile, role, logout resets others
│   ├── workoutStore.ts        # Persisted (AsyncStorage 'workout-storage') — active session state
│   └── assignmentStore.ts     # Persisted (AsyncStorage 'assignment-storage') — client assignments
├── types/
│   ├── user.ts                # UserRole, UserProfile
│   ├── workout.ts             # Exercise, WorkoutExercise, ExerciseLog, MuscleGroup, Equipment, Difficulty
│   ├── assignment.ts          # Assignment interface
│   ├── generation.ts          # GenerationRequest, GeneratedPlan, GeneratedRoutine, GenerationError
│   └── marketplace.ts         # TrainerListing, Review
├── supabase/
│   ├── schema.sql             # Base schema (6 tables, RLS, trigger) — DEPLOYED
│   ├── migrations/
│   │   └── phase7c_ai_generation.sql  # ALTER TABLE additions — NOT YET APPLIED
│   └── functions/
│       └── generate-plan/
│           └── index.ts       # Deno Edge Function (OpenAI, auth, premium gate)
├── docs/
│   ├── architecture.md        # Stack, routing, state management, design system
│   ├── product-requirements.md # PRD with phase breakdown
│   └── mvp-roadmap.md         # Phase 1-4 roadmap (needs updating)
├── tests/                     # EMPTY — no tests written
├── features/                  # EMPTY — reserved for feature modules
├── AGENTS.md                  # Agent instructions (partially outdated)
├── TASKS.md                   # Phase 1-4 checklist (needs updating for Phase 5-7)
├── README.md                  # Setup instructions
├── package.json               # Deps, scripts
├── tsconfig.json              # Strict, exclude supabase/functions
├── app.json                   # Expo config (scheme: ai-gym-app)
└── .env                       # Supabase URL + anon key (see §4)
```

---

## 4. Environment Variables & Secrets

### `.env` (committed — for local dev only)

| Variable | Purpose | Status |
|----------|---------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Set (real value) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Set (real value) |
| `EXPO_PUBLIC_API_URL` | Phase 2 REST placeholder | Empty |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Phase 2 | Empty |
| `EXPO_PUBLIC_APPLE_CLIENT_ID` | OAuth Phase 2 | Empty |
| `EXPO_PUBLIC_ENABLE_AI` | Legacy flag (unused, check constants.ts instead) | `false` |
| `EXPO_PUBLIC_ENABLE_CHAT` | Legacy flag (unused) | `false` |

### Supabase secrets (server-side, not in `.env`)

| Secret | Purpose | Status |
|--------|---------|--------|
| `OPENAI_API_KEY` | Used by `generate-plan` Edge Function | **NOT YET SET** — must be added via `supabase secrets set OPENAI_API_KEY=sk-...` |

### MCP config

`.vscode/mcp.json` lives at the **parent** workspace level (`/Users/bellomohammed/Dev/.vscode/mcp.json`) and configures the Supabase MCP server with project ref `fcsllrdvsizlrrqatgeq`.

---

## 5. Database Schema

### Live (deployed via `schema.sql`)

| Table | Key Columns | RLS |
|-------|------------|-----|
| `profiles` | id (FK auth.users), role, full_name, avatar_url, goal, bio, created_at | Own read/write, trainers read linked |
| `trainer_client_links` | trainer_id, client_id, status (active/inactive/pending), unique(trainer_id, client_id) | Trainers manage, clients read |
| `programs` | name, description, difficulty, days_per_week, created_by | Creator manages, linked clients read |
| `routines` | program_id, name, difficulty, duration_minutes, exercises_json (JSONB), sort_order | Via program owner policy |
| `assignments` | trainer_id, client_id, routine_id, routine_name, program_name, schedule_days[], status, note | Trainers manage, clients read/update status |
| `completed_workouts` | user_id, routine_id, routine_name, started_at, completed_at, duration_seconds, volume/sets/reps, exercises_json | Own manage, trainers read linked |

**Trigger:** `on_auth_user_created` → auto-inserts a `profiles` row using `raw_user_meta_data.role` and `raw_user_meta_data.full_name`.

### Pending migration: `phase7c_ai_generation.sql`

```sql
-- programs: add source tracking and trainer endorsement
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'client'
    CHECK (source IN ('client', 'trainer', 'ai', 'ai_endorsed')),
  ADD COLUMN IF NOT EXISTS generation_metadata jsonb,
  ADD COLUMN IF NOT EXISTS trainer_endorsed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS trainer_endorsed_at timestamptz;

-- profiles: track free AI generation count
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_generation_count integer NOT NULL DEFAULT 0;

-- RPC to increment counter
CREATE OR REPLACE FUNCTION public.increment_ai_generation_count(user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles SET ai_generation_count = ai_generation_count + 1 WHERE id = user_id;
$$;
```

### Missing migration: Marketplace/profile columns

The `services/profiles.ts` Profile type and `services/marketplace.ts` reference columns that **do NOT exist** in `schema.sql` or any migration:

```
username text UNIQUE
specialties text[]
certifications text[]
intro_video text
experience_years integer DEFAULT 0
is_public boolean DEFAULT false
rating_avg real DEFAULT 0
rating_count integer DEFAULT 0
```

These need an ALTER TABLE migration before marketplace features work at runtime. The code compiles because TypeScript doesn't validate against the live DB schema — it only checks the interface.

---

## 6. Auth Flow

1. **Cold start** → `hooks/useSession.ts` calls `supabase.auth.getSession()` to restore a persisted session.
2. If a session exists → fetch `profiles` row → `authStore.setProfile(profile)` sets `role`.
3. `supabase.auth.onAuthStateChange` listens for SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED.
4. `app/index.tsx` redirects based on state:
   - `loading: true` → spinner
   - `!hasOnboarded` → `(auth)/onboarding`
   - `!isAuthenticated` → `(auth)/login`
   - `role === 'trainer'` → `(trainer)/dashboard`
   - else → `(client)/workout`
5. **Logout** → `authStore.logout()` calls `signOut()` (Supabase), resets workoutStore and assignmentStore.
6. `hasOnboarded` is persisted in AsyncStorage (`ai-gym:hasOnboarded`).

**Auth method:** Email + password only. OAuth (Google, Apple) is scaffolded in the UI but not wired.

---

## 7. State Management Detail

### authStore (`store/authStore.ts`)
- **NOT persisted** — session is restored from Supabase on cold start.
- Fields: `loading`, `isAuthenticated`, `role`, `pendingRole`, `hasOnboarded`, `user` (Supabase User), `profile` (Profile row).
- `logout()` fires Supabase `signOut()` and calls `.reset()` on workoutStore and assignmentStore.

### workoutStore (`store/workoutStore.ts`)
- **Persisted** via AsyncStorage key `'workout-storage'`.
- Tracks active workout session state: current routine, exercise index, sets completed, timer, volume.
- `reset()` clears active session (called on logout).

### assignmentStore (`store/assignmentStore.ts`)
- **Persisted** via AsyncStorage key `'assignment-storage'`.
- Caches client assignments fetched from Supabase.
- `reset()` clears cache (called on logout).

### Historical bug: Zustand infinite render loops
Early builds had infinite re-renders caused by creating new object references in selectors. **Fix:** Always use atomic selectors (`s => s.field`) not object-spread selectors (`s => ({ a: s.a, b: s.b })`).

---

## 8. AI Generation Architecture

### Client-side flow

1. `(client)/workout.tsx` → "Generate Workout" button → `router.push('/(client)/generate')`.
2. `(client)/generate.tsx` → user selects goal, horizon (today/week/month), daysPerWeek, duration, difficulty, equipment, focus areas.
3. `usePremiumGate()` hook checks `ai_generation_count` against `FREE_AI_GENERATION_LIMIT` (3).
4. If gate open → `services/generation.ts` → `supabase.functions.invoke('generate-plan', { body: request })`.
5. On success → navigate to `(client)/review-plan.tsx` with plan data.
6. User reviews routines/exercises → "Save Program" calls `services/programs.ts → saveGeneratedPlan()` → inserts program + routines with `source: 'ai'`.

### Edge Function (`supabase/functions/generate-plan/index.ts`)

- **Runtime:** Deno (Supabase Edge Functions).
- **Auth:** Extracts JWT from `Authorization` header, validates via `supabase.auth.getUser(token)`.
- **Premium gate:** Checks `profiles.ai_generation_count >= 3` → returns 403 with usage info.
- **AI call:** OpenAI Chat Completions API with `gpt-4o-mini`, `response_format: { type: 'json_object' }`.
- **Prompt:** System prompt instructs the model to return a specific JSON schema matching `GeneratedPlan`.
- **Post-generation:** Calls RPC `increment_ai_generation_count(userId)`.
- **CORS:** Handles OPTIONS preflight for web compatibility.

### Trainer endorsement

- `(trainer)/client-detail.tsx` shows AI-generated programs for a linked client.
- "Endorse" button calls `services/programs.ts → endorseProgram()` → updates `source` to `'ai_endorsed'`, sets `trainer_endorsed_by` and `trainer_endorsed_at`.

### What's NOT deployed yet

1. Migration `phase7c_ai_generation.sql` — must be run in Supabase SQL Editor.
2. Edge Function `generate-plan` — must be deployed via `supabase functions deploy generate-plan`.
3. `OPENAI_API_KEY` secret — must be set via `supabase secrets set`.

---

## 9. Feature Flags & Constants

`config/constants.ts`:

```typescript
ENABLE_AI_GENERATION: true     // AI generation UI visible
ENABLE_MARKETPLACE: true       // Trainer search/discovery visible
ENABLE_CHAT: false             // Messaging not built
ENABLE_VOIP: false             // Voice coaching not built
ENABLE_SUBSCRIPTIONS: false    // RevenueCat not integrated
FREE_AI_GENERATION_LIMIT: 3    // Free tier cap
```

The `.env` flags (`EXPO_PUBLIC_ENABLE_AI`, `EXPO_PUBLIC_ENABLE_CHAT`) are **legacy** and unused — the source of truth is `config/constants.ts`.

---

## 10. What Phase Is Complete

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Foundation | ✅ Complete | Shell, routing, mock auth, dark theme, all base screens |
| 2 — Core (partial) | ✅ Complete | Supabase auth (email/pw), profiles, workout logging, programs CRUD |
| 3 — AI (partial) | ~80% | AI generation coded but Edge Function not deployed |
| 5 — Data Layer | ✅ Complete | Supabase schema, RLS, services, hooks |
| 6 — Trainer Flow | ✅ Complete | Client management, assignments, realtime sync |
| 6B — Marketplace | ✅ Code complete | Discover, trainer profiles, reviews, link requests (missing DB migration for profile columns) |
| 7A — Workout Session | ✅ Complete | Live session, set/rep/weight logging, rest timer, summary, persist to Supabase |
| 7B — Premium Gate | ✅ Complete | PremiumGate component, usePremiumGate hook, generation counter |
| 7C — AI Generation UI | ✅ Code complete | generate.tsx, review-plan.tsx, endorsement in client-detail.tsx (needs migration + deploy) |

### Phases NOT started

- **Phase 3 remainder:** Chat/messaging, voice coaching, progress photos
- **Phase 4:** RevenueCat subscriptions, push notifications, app store submission, analytics, crash reporting
- **Charts:** `statistics.tsx` is a placeholder — no chart library installed (victory-native or similar)
- **OAuth:** Google and Apple sign-in UI exists but is not wired
- **Tests:** `tests/` directory is empty; no test framework configured

---

## 11. Known Issues & Technical Debt

### Critical (blocks runtime behavior)

1. **Missing marketplace migration** — `profiles` table lacks `username`, `specialties`, `certifications`, `intro_video`, `experience_years`, `is_public`, `rating_avg`, `rating_count`. Any marketplace query will fail at runtime. Create an ALTER TABLE migration.

2. **Phase 7C migration not applied** — `supabase/migrations/phase7c_ai_generation.sql` has not been run. AI generation will fail until `source`, `generation_metadata`, `trainer_endorsed_by/at`, and `ai_generation_count` columns exist.

3. **Edge Function not deployed** — `supabase/functions/generate-plan/index.ts` exists locally but is not deployed. Run `supabase functions deploy generate-plan`.

4. **OPENAI_API_KEY not set** — The Edge Function reads `Deno.env.get('OPENAI_API_KEY')`. Must set via `supabase secrets set OPENAI_API_KEY=sk-...`.

### Medium

5. **AGENTS.md outdated** — Still says "No backend integration (Phase 2)" and "No real API calls in Phase 1". Backend integration exists since Phase 5. Update to reflect current state.

6. **TASKS.md outdated** — Only lists Phase 1-4. Phase 5, 6, 6B, 7A, 7B, 7C are not documented. Update to match actual progress.

7. **docs/architecture.md outdated** — Lists Phase 1 feature flags (`AI_WORKOUT: false`, etc.) and doesn't mention Supabase, Edge Functions, or any Phase 5+ work.

8. **App.tsx is dead code** — The file exists at repo root but expo-router uses `expo-router/entry` as the entry point. Can be deleted.

9. **`otp-verify.tsx` is a stub** — OTP verification was never implemented. Either implement or remove.

10. **`schedule.tsx` is a stub** — Empty screen. Either implement or remove.

11. **`create-program.tsx` is a stub** — Client-side program creation not implemented.

### Low

12. **No ESLint/Prettier** — No code formatting or linting configured.

13. **No `.gitignore` audit** — `.env` with real keys is likely committed. Consider using `.env.local` pattern.

14. **`data/` mock files still present** — `clients.ts`, `routines.ts` were for Phase 1 demo. Some screens may still reference them instead of Supabase data.

15. **`expo-secure-store` unused** — Storage migrated to AsyncStorage for Zustand persistence. SecureStore is still a dependency but `services/storage.ts` may be dead code.

---

## 12. Color Reference (Dark Theme)

From `config/theme.ts`:

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#0D0D0D` | Screen background |
| `surface` | `#1A1A1A` | Card/container background |
| `card` | `#1E1E1E` | Elevated card |
| `accent` | `#4ADE80` | Primary action, CTA, highlights |
| `text` | `#FFFFFF` | Primary text |
| `textSecondary` | `#A1A1AA` | Muted text |
| `border` | `#2A2A2A` | Dividers, borders |
| `danger` | (red) | Error states — **NOT `error`** |
| `warning` | (amber) | Warning states |
| `success` | (green) | Confirmation states |

**Important:** There is no `colors.error` (use `colors.danger`) and no `colors.surfaceAlt` (use `colors.background` or `colors.surface`).

---

## 13. Workout Data Model

The nested structure is critical and a common source of bugs:

```typescript
// types/workout.ts

interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  instructions: string[];
}

interface WorkoutExercise {
  exercise: Exercise;          // ← nested object, NOT flat
  sets: ExerciseSet[];
  restSeconds: number;
  notes?: string;
}

// When mapping exercises in review-plan.tsx or session.tsx:
// ✅ exercise.exercise.name
// ❌ exercise.name  ← WRONG, this doesn't exist
```

`routines.exercises_json` stores `WorkoutExercise[]` as JSONB in Postgres. The Edge Function's OpenAI prompt instructs the model to output this exact nested shape.

---

## 14. Recommended First Commands

```bash
# 1. Verify clean compile
cd /Users/bellomohammed/Dev/experiments/ai-gym-app
npx tsc --noEmit

# 2. Start dev server
npx expo start

# 3. Apply pending Phase 7C migration (copy SQL into Supabase Dashboard → SQL Editor)
# File: supabase/migrations/phase7c_ai_generation.sql

# 4. Create marketplace migration (REQUIRED before marketplace features work)
# Add to profiles: username, specialties, certifications, intro_video,
#   experience_years, is_public, rating_avg, rating_count
# Add RPC: check_username_available, find_user_by_username

# 5. Deploy Edge Function (requires Supabase CLI)
supabase functions deploy generate-plan

# 6. Set OpenAI secret
supabase secrets set OPENAI_API_KEY=sk-...

# 7. Update stale docs
# - AGENTS.md: remove Phase 1 restrictions, document Phase 5-7 reality
# - TASKS.md: add Phase 5, 6, 6B, 7A, 7B, 7C with checkmarks
# - docs/architecture.md: add Supabase, Edge Functions, AI generation, marketplace
```

---

## End of Handoff

This document reflects the verified state of the codebase as of the handoff date. Every file path, column name, and status was confirmed by audit. If something in the code contradicts this document, the code is the source of truth — but flag it, because it likely means a bug or drift was introduced after this handoff.
