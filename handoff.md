 Handoff — AI Gym App

> **For:** Cline (implementation agent)
> **From:** Audit pass (full codebase review)
> **Date:** 2026-04-15
> **Repo root:** `/Users/bellomohammed/Dev/experiments/ai-gym-app`

---

## 1. Executive Summary

AI Gym is a React Native (Expo SDK 54) fitness app targeting two user roles: **clients** (gym-goers) and **trainers** (coaches managing multiple clients). It combines AI-generated workout programming with real trainer oversight. The app is part of a broader "app factory" strategy — the owner builds portfolio-quality products to demonstrate full-stack, AI-integrated mobile engineering.

**Current state:** The app is feature-complete through Phase 8 (Bug Fixes & Polish) plus additional hardening passes (App Simplification, Visual Language, Trainer Workflow Maturity, Trainer Conversion Loop + Beta Hardening). Auth (Supabase email/password), role-based routing, workout logging with grouped sets (supersets/trisets/giantsets), trainer-client linking, program management, assignment flow with day-level scheduling, marketplace discovery, real-time subscriptions, AI plan generation UI, entitlement/billing architecture, and unit preferences (kg/lb) are all coded. TypeScript compiles with **zero errors**.

**What's deployed:** Supabase project exists (`fcsllrdvsizlrrqatgeq`). Base schema (6 tables) is live. Phase 7C migration SQL (283 lines, 5-part mega-migration) and Edge Function are written but **NOT yet applied/deployed**. Phase 10 entitlements migration is written but **NOT yet applied**.

**Revenue model:** Freemium. 3 free AI generations → 7-day trial → subscription unlock (RevenueCat adapter pattern, Phase 10). Trainer marketplace with reviews, ratings, and profile discovery.

---

## 2. Stack & Tooling

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Expo (managed) | SDK 54 | New architecture enabled |
| UI | React Native | 0.81.5 | No native modules |
| Language | TypeScript | 5.9.2 | Strict mode, tsc clean |
| Routing | expo-router | 6.0.23 | File-based, 5 route groups |
| State | Zustand | 5.0.12 | **6 stores** (see §7) |
| Backend | Supabase | JS v2.101.1 | Auth, Postgres, Edge Functions, Realtime |
| AI | OpenAI gpt-4o-mini | — | Via Supabase Edge Function only |
| Storage | AsyncStorage | 2.2.0 | Zustand persistence + routine drafts |
| Secure Storage | expo-secure-store | ~15.0.8 | Legacy token wrapper only |
| Billing | RevenueCat | — | Adapter pattern (mock + real) |
| Package Manager | Yarn | 4.4.1 | PnP not enabled, classic node_modules |

**No ESLint, Prettier, or test runner configured.**

### Key commands

```bash
npx expo start          # Dev server (Expo Go or dev client)
npx tsc --noEmit        # Type check (currently 0 errors)
yarn install            # Install dependencies
```

### ⚠️ IDE False Positives

VS Code may show `--jsx` or JSX-related red squiggles. These are **false positives** caused by the IDE TypeScript server. Always verify with `npx tsc --noEmit` before treating any error as real.

---

## 3. Project Structure

```
ai-gym-app/
├── app/                            # expo-router file-based screens
│   ├── _layout.tsx                 # Root Stack (StatusBar, no providers wrapping)
│   ├── index.tsx                   # Entry redirect: loading→onboarding→auth→role
│   ├── +not-found.tsx              # 404 fallback
│   ├── (auth)/                     # Headerless Stack
│   │   ├── onboarding.tsx          # Swipe intro → login
│   │   ├── login.tsx               # Email/password + social placeholders
│   │   ├── register.tsx            # Name, email, password, role picker
│   │   ├── otp-verify.tsx          # OTP verification (placeholder)
│   │   └── biometric-setup.tsx     # Biometric (placeholder)
│   ├── (client)/                   # Client tab group
│   │   ├── _layout.tsx             # ClientTabSwipeView layout
│   │   ├── workout.tsx             # Today's workout, notification banner, Start
│   │   ├── schedule.tsx            # 7-day schedule with DayPicker, resolution
│   │   ├── statistics.tsx          # Workout history + volume/frequency stats
│   │   ├── programs.tsx            # Program list with drill-down
│   │   ├── plans.tsx               # Plan management (self/coach/AI plans)
│   │   ├── create-routine.tsx      # Client routine builder with grouping
│   │   ├── create-program.tsx      # Client program creation
│   │   ├── generate.tsx            # AI generation form (goal/equipment/duration)
│   │   ├── review-plan.tsx         # AI plan review (accept/edit/regenerate)
│   │   ├── discover.tsx            # Trainer marketplace search
│   │   ├── trainer-profile.tsx     # Public trainer profile view
│   │   └── profile.tsx             # Client profile + settings
│   ├── (trainer)/                  # Trainer tab group
│   │   ├── _layout.tsx             # Trainer tab navigation
│   │   ├── dashboard.tsx           # Stats grid (active clients, compliance, etc.)
│   │   ├── clients.tsx             # Client list with search, real lastActive
│   │   ├── client-detail.tsx       # Single client view with assignment status
│   │   ├── programs.tsx            # Trainer program list
│   │   ├── program-detail.tsx      # Program drill-down
│   │   ├── create-routine.tsx      # Trainer routine builder with grouping
│   │   ├── assign.tsx              # Assign routine to client with day picker
│   │   ├── invite-client.tsx       # Invite by username/email/phone
│   │   ├── profile.tsx             # Trainer profile view
│   │   └── edit-profile.tsx        # Trainer profile edit (bio, specialties, etc.)
│   ├── (workout)/                  # Workout session screens
│   │   ├── session.tsx             # Live workout (timer, sets, rest, grouped exercises)
│   │   ├── edit.tsx                # Pre-start workout editing
│   │   └── summary.tsx             # Post-workout summary (hero stats, recap, reflection)
│   └── (shared)/                   # Cross-role screens
│       ├── _layout.tsx             # Shared Stack
│       ├── settings.tsx            # App settings (unit toggle, dev tools)
│       └── subscription.tsx        # Subscription paywall (billing adapter)
├── components/
│   ├── ui/                         # Shared UI primitives
│   │   ├── Screen.tsx              # SafeAreaView wrapper with bg color
│   │   ├── Button.tsx              # Theme-aware button (primary/outline/ghost)
│   │   ├── Card.tsx                # Theme card with borderRadius, shadow
│   │   ├── PlanBadge.tsx           # Colored badge for plan source (coach/self/AI)
│   │   ├── SectionHeader.tsx       # Section title with optional action
│   │   ├── EmptyState.tsx          # Empty state with icon + message + CTA
│   │   ├── SegmentedControl.tsx    # iOS-style segmented tab switcher
│   │   ├── WeightUnitToggle.tsx    # kg/lb toggle using preferencesStore
│   │   ├── DayPicker.tsx           # 7-day horizontal picker (Mon–Sun)
│   │   └── PremiumGate.tsx         # Premium feature gate overlay
│   ├── workout/                    # Workout-specific components
│   │   ├── ExerciseCard.tsx        # Single exercise display in session
│   │   ├── ExerciseGroupCard.tsx   # Grouped exercises (superset/triset/giantset)
│   │   ├── SetRow.tsx              # Individual set row (reps, weight, check)
│   │   ├── RestTimer.tsx           # Countdown rest timer
│   │   ├── SummaryHeroStat.tsx     # Large stat display (duration, volume, sets)
│   │   ├── SummaryRecapRow.tsx     # Per-exercise recap in summary
│   │   ├── SummaryAchievements.tsx # Achievement badges in summary
│   │   └── ReflectionSheet.tsx     # Post-workout effort/notes sheet
│   └── navigation/
│       └── ClientTabSwipeView.tsx  # Swipeable tab container for client views
├── config/
│   ├── theme.ts                    # Design tokens (colors, spacing, fontSize, borderRadius)
│   ├── constants.ts                # App-wide constants
│   ├── supabase.ts                 # Supabase client init
│   ├── copy.ts                     # All user-facing strings (centralized)
│   ├── featureGates.ts             # Feature limits (ai_generation: 3, trial: 7d)
│   └── billing.ts                  # RevenueCat env config (keys from EXPO_PUBLIC_*)
├── data/                           # Static seed/demo data
│   ├── exercises.ts                # Exercise library
│   ├── routines.ts                 # Demo routines
│   └── clients.ts                  # Demo client data
├── docs/
│   ├── architecture.md             # Architecture overview
│   ├── product-requirements.md     # PRD
│   ├── mvp-roadmap.md              # Phase roadmap
│   └── deploy-runbook-phase8.md    # Deploy runbook (migrations + Edge Function)
├── hooks/
│   ├── useSession.ts               # Auth bootstrap + store hydration
│   ├── useEntitlement.ts           # Entitlement state hook
│   ├── useFeatureGate.ts           # Feature gate check (allowed/upgrade_required)
│   ├── usePremiumGate.ts           # Premium gate convenience hook
│   ├── usePrograms.ts              # Programs data hook
│   ├── useRoutines.ts              # Routines data hook
│   ├── useRealtime.ts              # Supabase realtime subscription
│   ├── useTrainerClients.ts        # Trainer client list hook
│   ├── useTrainerSearch.ts         # Trainer search hook
│   ├── useReviews.ts               # Reviews data hook
│   └── useUserId.ts                # Current user ID shortcut
├── services/
│   ├── auth.ts                     # signIn, signUp, signOut, getSession, onAuthStateChange
│   ├── profiles.ts                 # getProfile, updateProfile
│   ├── programs.ts                 # CRUD programs/routines, fetchTrainer/ClientRoutines, saveGeneratedPlan, endorseProgram
│   ├── workouts.ts                 # saveCompletedWorkout, fetchWorkoutHistory, fetchWorkoutStats
│   ├── assignments.ts              # Assignment CRUD
│   ├── trainer.ts                  # fetchTrainerClients (real lastActive), linkClient, fetchTrainerDashboardStats
│   ├── marketplace.ts              # searchTrainers, getTrainerPublicProfile, reviews, invites, username, requestTraining
│   ├── generation.ts               # generatePlan (Edge Function), getGenerationCount, mock generation, error normalization
│   ├── schedule.ts                 # resolveDayRoutine (priority: trainer > self/AI), assignmentToWorkoutRoutine
│   ├── units.ts                    # kg/lb conversion, formatWeightWithUnit, parseWeightInputToKg, warmup helpers
│   ├── routineDrafts.ts            # AsyncStorage draft persistence for routine builder
│   ├── entitlements.ts             # loadEntitlementRecord, resolveEntitlement, syncBillingEntitlement, ensureTrialRecord
│   ├── storage.ts                  # SecureStore token wrapper (legacy)
│   └── billing/
│       ├── BillingAdapter.ts       # Abstract adapter interface (plans, purchase, restore, customerState)
│       ├── MockBillingAdapter.ts   # Mock implementation for dev/testing
│       └── RevenueCatBillingAdapter.ts # RevenueCat implementation (functional but needs store setup)
├── store/
│   ├── authStore.ts                # Auth state (user, profile, role, loading, hasOnboarded, clearUserScope)
│   ├── workoutStore.ts             # Active session, exercise logs, timer, pause/resume, history
│   ├── assignmentStore.ts          # Assignments, notifications, dayOverrides, schedule resolution
│   ├── preferencesStore.ts         # Weight unit preference (kg/lb), persisted
│   ├── entitlementStore.ts         # Entitlement record + resolved state, hydrate/refresh/reset
│   └── devEntitlementStore.ts      # Dev scenario overrides (7 scenarios), mock generation toggle
├── types/
│   ├── workout.ts                  # WeightUnit, WorkoutEffort, WorkoutExerciseGroupType, Exercise, WorkoutSet, WorkoutExercise, SetLog, ExerciseLog, ActiveSession, WorkoutRoutine, etc.
│   ├── assignment.ts               # Assignment, ClientNotification, TrainerClient, ResolvedDayRoutine, DayOfWeek, AssignmentSource, DayRoutineResolutionReason
│   ├── entitlement.ts              # EntitlementState, PlanTier, BillingSource, FeatureKey, EntitlementRecord, ResolvedEntitlement, FeatureGateResult
│   ├── generation.ts               # GenerationRequest, GeneratedPlan, GeneratedRoutine, GenerationError, AppGenerationError, GenerationFailureCode
│   ├── marketplace.ts              # TrainerPublicProfile, Review, Invite, InviteType
│   └── user.ts                     # UserRole, Profile
├── supabase/
│   ├── schema.sql                  # Base schema (6 tables, RLS, triggers)
│   ├── migrations/
│   │   ├── phase7c_hosted_repair.sql  # 283-line mega-migration (5 parts, NOT APPLIED)
│   │   └── phase10_entitlements.sql   # Entitlements infrastructure (NOT APPLIED)
│   └── functions/
│       └── generate-plan/
│           └── index.ts            # Edge Function: OpenAI generation (NOT DEPLOYED)
├── AGENTS.md                       # Agent behavioral rules
├── TASKS.md                        # Phase checklist (through Phase 9)
├── handoff.md                      # This file
└── package.json
```

---

## 4. Design System

### Color Tokens (`config/theme.ts`)

```typescript
colors: {
  background: '#0D0D0D',     // App background
  surface:    '#1A1A1A',     // Elevated surface
  card:       '#1E1E1E',     // Card background
  cardBorder: '#262626',     // Card border
  accent:     '#4ADE80',     // Primary green accent
  textPrimary:   '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted:     '#6B6B6B',
  border:        '#2A2A2A',
  dangerLight:   '#F87171',  // Semantic: errors, destructive
  warningLight:  '#FACC15',  // Semantic: warnings, cautions
  infoLight:     '#60A5FA',  // Semantic: info, coach plans
}
```

### Spacing, Typography, Radii

```typescript
spacing:  { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 }
borderRadius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 }
```

### Plan Source Colors (`config/copy.ts`)

| Source | Label | Color |
|--------|-------|-------|
| `trainer` | Coach Plan | `#60A5FA` (blue) |
| `self` | Self Plan | `#A78BFA` (purple) |
| `ai` | AI Plan | `#4ADE80` (green/accent) |

---

## 5. Screens Inventory

### (auth)/ — Authentication Flow

| Screen | File | Status | Description |
|--------|------|--------|-------------|
| Onboarding | `onboarding.tsx` | ✅ Complete | Swipe intro carousel → login |
| Login | `login.tsx` | ✅ Complete | Email/password with Supabase auth |
| Register | `register.tsx` | ✅ Complete | Name, email, password, role picker |
| OTP Verify | `otp-verify.tsx` | 🔸 Placeholder | UI exists, no backend hook |
| Biometric | `biometric-setup.tsx` | 🔸 Placeholder | UI exists, no biometric API |

### (client)/ — Client Screens

| Screen | File | Status | Description |
|--------|------|--------|-------------|
| Workout | `workout.tsx` | ✅ Complete | Today's workout, notification banner (copy.ts), assignment-resolved routine, Start button |
| Schedule | `schedule.tsx` | ✅ Complete | 7-day DayPicker, resolution reasons, override support |
| Statistics | `statistics.tsx` | ✅ Complete | Workout history list + volume/frequency stats |
| Programs | `programs.tsx` | ✅ Complete | Program list with drill-down |
| Plans | `plans.tsx` | ✅ Complete | Coach/Self/AI plan sections with PlanBadge |
| Create Routine | `create-routine.tsx` | ✅ Complete | Exercise picker, grouping (superset/triset/giantset), draft persistence |
| Create Program | `create-program.tsx` | ✅ Complete | Program creation with routine selection |
| Generate | `generate.tsx` | ✅ Complete | AI generation form (goal, equipment, duration, horizon) |
| Review Plan | `review-plan.tsx` | ✅ Complete | AI plan review with accept/edit/regenerate |
| Discover | `discover.tsx` | ✅ Complete | Trainer search with specialty filter chips |
| Trainer Profile | `trainer-profile.tsx` | ✅ Complete | Public trainer profile with reviews, request training |
| Profile | `profile.tsx` | ✅ Complete | Client profile view |

### (trainer)/ — Trainer Screens

| Screen | File | Status | Description |
|--------|------|--------|-------------|
| Dashboard | `dashboard.tsx` | ✅ Complete | Stats grid (active clients, compliance, sessions) |
| Clients | `clients.tsx` | ✅ Complete | Client list, search, real lastActive timestamps |
| Client Detail | `client-detail.tsx` | ✅ Complete | Assignment status labels (Awaiting/InProgress/Completed from copy.ts) |
| Programs | `programs.tsx` | ✅ Complete | Trainer program list |
| Program Detail | `program-detail.tsx` | ✅ Complete | Program drill-down with routines |
| Create Routine | `create-routine.tsx` | ✅ Complete | Trainer routine builder with exercise grouping |
| Assign | `assign.tsx` | ✅ Complete | Assign routine to client, day picker, post-assign alert (copy.ts) |
| Invite Client | `invite-client.tsx` | ✅ Complete | Invite by username/email/phone, post-link alerts (copy.ts) |
| Profile | `profile.tsx` | ✅ Complete | Trainer profile view |
| Edit Profile | `edit-profile.tsx` | ✅ Complete | Bio, specialties, certifications, intro video |

### (workout)/ — Workout Session

| Screen | File | Status | Description |
|--------|------|--------|-------------|
| Session | `session.tsx` | ✅ Complete | Live workout: timer, set logging, rest timer, grouped exercises, pause/resume |
| Edit | `edit.tsx` | ✅ Complete | Pre-start workout editing (reorder, add/remove exercises) |
| Summary | `summary.tsx` | ✅ Complete | Hero stats, per-exercise recap, achievements, reflection sheet |

### (shared)/ — Cross-Role Screens

| Screen | File | Status | Description |
|--------|------|--------|-------------|
| Settings | `settings.tsx` | ✅ Complete | Unit toggle (kg/lb), dev entitlement tools (__DEV__ only) |
| Subscription | `subscription.tsx` | ✅ Complete | Paywall with billing adapter integration |

---

## 6. Services Layer

### Core Services

| Service | File | Exports |
|---------|------|---------|
| **auth** | `services/auth.ts` | `signIn`, `signUp`, `signOut`, `getSession`, `onAuthStateChange` |
| **profiles** | `services/profiles.ts` | `getProfile`, `updateProfile` |
| **programs** | `services/programs.ts` | `fetchPrograms`, `createProgram`, `deleteProgram`, `fetchRoutines`, `createRoutine`, `updateRoutine`, `deleteRoutine`, `fetchTrainerRoutines`, `fetchClientRoutines`, `fetchClientPrograms`, `routineRowToWorkoutRoutine`, `saveGeneratedPlan`, `endorseProgram` |
| **workouts** | `services/workouts.ts` | `saveCompletedWorkout`, `fetchWorkoutHistory`, `fetchWorkoutStats` |
| **assignments** | `services/assignments.ts` | Assignment CRUD operations |
| **trainer** | `services/trainer.ts` | `fetchTrainerClients` (real lastActive: New/Today/Xd ago/Xw ago), `linkClient`, `fetchTrainerDashboardStats` |
| **marketplace** | `services/marketplace.ts` | `searchTrainers`, `getTrainerPublicProfile`, `fetchReviews`, `submitReview`, `checkUsernameAvailable`, `setUsername`, `findByUsername`, `createInvite`, `fetchTrainerInvites`, `updateTrainerProfile`, `requestTraining` |
| **generation** | `services/generation.ts` | `generatePlan` (Edge Function call + dev mock + error normalization), `getGenerationCount` |
| **schedule** | `services/schedule.ts` | `resolveDayRoutine` (priority: trainer > self/AI, supports manual overrides), `assignmentToWorkoutRoutine` |
| **units** | `services/units.ts` | `convertKgToUnit`, `convertUnitToKg`, `normalizeStoredKg`, `parseWeightInputToKg`, `formatWeightValue`, `formatWeightWithUnit`, `formatVolumeWithUnit`, `getWarmupWeightKg`, `getWarmupReps` |
| **routineDrafts** | `services/routineDrafts.ts` | `loadCreateRoutineDraft`, `saveCreateRoutineDraft`, `clearCreateRoutineDraft` + `RoutineBuilderDraftExercise`, `CreateRoutineDraft` types |
| **entitlements** | `services/entitlements.ts` | `loadEntitlementRecord`, `saveEntitlementRecord`, `ensureTrialRecord`, `resolveEntitlement`, `syncBillingEntitlement`, `applyBillingCustomerState`, `getBillingAdapter`, `setBillingAdapter` |
| **storage** | `services/storage.ts` | `getToken`, `setToken`, `clearToken` (legacy SecureStore wrapper) |

### Billing Adapters (`services/billing/`)

| File | Description |
|------|-------------|
| `BillingAdapter.ts` | Abstract interface: `isAvailable`, `configure`, `listPlans`, `purchase`, `restorePurchases`, `getCustomerState`, `openManageSubscription`, `logOut` |
| `MockBillingAdapter.ts` | Returns mock data for dev/testing (always available, returns sample plans) |
| `RevenueCatBillingAdapter.ts` | Real RevenueCat integration (functional skeleton, needs API keys + store setup) |

**Adapter selection** (in `entitlements.ts`): If `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` or `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` is set → RevenueCat adapter, otherwise → Mock adapter.

---

## 7. State Management (Zustand — 6 Stores)

### authStore (`store/authStore.ts`)
- **Persistence:** None (session from Supabase)
- **Shape:** `{ loading, isAuthenticated, role, pendingRole, hasOnboarded, user, session, profile }`
- **Key actions:** `setUser`, `setSession`, `setProfile`, `setLoading`, `setPendingRole`, `setHasOnboarded`, `clearUserScope` (resets other stores on sign-out), `logout`

### workoutStore (`store/workoutStore.ts`)
- **Persistence:** AsyncStorage `'workout-storage'`
- **Shape:** `{ activeSession, exerciseLogs, currentExerciseIndex, elapsedSeconds, isRunning, history }`
- **Key actions:** `startWorkout`, `logSet`, `nextExercise`, `prevExercise`, `finishWorkout`, `pauseWorkout`, `resumeWorkout`, `cancelWorkout`, `updateExerciseNote`, `hydrateHistory`

### assignmentStore (`store/assignmentStore.ts`)
- **Persistence:** AsyncStorage `'assignment-storage'`
- **Shape:** `{ assignments[], notifications[], daySelections{}, hydrating }`
- **Key actions:** `hydrate`, `createAssignment`, `updateAssignmentStatus`, `selfAssign`, `resolveDayRoutine`, `markNotificationRead`, `markAllNotificationsRead`, `setDayOverride`, `clearDayOverride`, `removeRoutineReferences`, `syncRoutineOverrideSnapshot`

### preferencesStore (`store/preferencesStore.ts`)
- **Persistence:** AsyncStorage `'preferences-storage'`
- **Shape:** `{ weightUnit: 'kg' | 'lb' }`
- **Key actions:** `setWeightUnit`, `toggleWeightUnit`
- **Usage:** Used by SetRow, SummaryRecapRow, StatisticsScreen, units.ts helpers

### entitlementStore (`store/entitlementStore.ts`)
- **Persistence:** None (fetched from Supabase + billing adapter on hydrate)
- **Shape:** `{ loading, record: EntitlementRecord | null, resolved: ResolvedEntitlement | null }`
- **Key actions:** `hydrate(userId, role)`, `refresh(userId, role)`, `reset()`
- **Hydration flow:** `ensureTrialRecord` (clients) → `syncBillingEntitlement` → `resolveEntitlement`

### devEntitlementStore (`store/devEntitlementStore.ts`)
- **Persistence:** AsyncStorage `'dev-entitlement-storage'`
- **Shape:** `{ scenario: DevEntitlementScenario, mockGenerationEnabled: boolean }`
- **Scenarios:** `use_real`, `free_under_cap`, `free_at_cap`, `trial_active`, `premium_active`, `admin_override`, `expired_trial`
- **Used by:** `generation.ts` (respects mock scenarios in `__DEV__`), `settings.tsx` (UI for toggling)

---

## 8. Types Reference

### workout.ts (117 lines)
- `WeightUnit = 'kg' | 'lb'`
- `WorkoutEffort = 'easy' | 'solid' | 'challenging' | 'max_effort'`
- `WorkoutExerciseGroupType = 'single' | 'superset' | 'triset' | 'giantset'`
- `Difficulty = 'beginner' | 'intermediate' | 'advanced'`
- `Equipment` — union of 10+ equipment types
- `MuscleGroup` — union of 15+ muscle groups
- `Exercise { id, name, muscleGroups, equipment, description?, imageUrl? }`
- `WorkoutSet { reps, weight, restSeconds?, isWarmup? }`
- `WorkoutExercise { exercise, sets, groupId?, groupType?, groupOrder? }`
- `SetLog { reps, weight, restSeconds, completed, isWarmup? }`
- `ExerciseLog { exercise, sets: SetLog[], note?, groupId?, groupType?, groupOrder? }`
- `ActiveSession { id, routineId?, routineName, startedAt, exercises, status?, elapsedSeconds?, lastResumedAt? }`
- `WorkoutRoutine { id, name, exercises, difficulty, programName?, assignedBy?, source? }`
- `CompletedWorkout { id, userId, routineName, exercises: ExerciseLog[], startedAt, completedAt, durationMinutes, totalVolume, totalSets, effort?, notes? }`

### assignment.ts (65 lines)
- `AssignmentSource = 'trainer' | 'self' | 'ai'`
- `AssignmentStatus = 'assigned' | 'in_progress' | 'completed'`
- `DayOfWeek = 'Mon' | 'Tue' | ... | 'Sun'`
- `DayRoutineResolutionReason = 'manual_override' | 'coach_assigned' | 'self_scheduled' | 'ai_scheduled' | 'empty'`
- `Assignment { id, trainerId, clientId, routineId, routineName, programName?, scheduleDays, status, source, note?, assignedAt, startedAt?, completedAt?, exercisesJson? }`
- `ClientNotification { id, type, title, body, assignmentId?, read, createdAt }`
- `TrainerClient { clientId, clientName, clientInitials, goal, email, active, lastActive, workoutCount, assignmentCount, adherencePercent, memberSince }`
- `ResolvedDayRoutine { day, activeRoutine, activeAssignment, reason, candidates, isManualOverride }`

### entitlement.ts (38 lines)
- `EntitlementState = 'free' | 'trial_active' | 'premium_active' | 'admin_override'`
- `PlanTier = 'free' | 'premium'`
- `BillingSource = 'mock' | 'manual' | 'admin' | 'revenuecat'`
- `FeatureKey = 'ai_generation' | 'grouped_routine_authoring'`
- `EntitlementRecord { planTier, trialStartedAt, trialEndsAt, trialUsed, adminOverride, source, updatedAt }`
- `ResolvedEntitlement { role, state, planTier, trialStartedAt, trialEndsAt, isTrialActive, isPremium, isAdminOverride, canUsePremiumFeatures }`
- `FeatureGateResult { feature, allowed, requiresUpgrade, reason }`

### generation.ts
- `GenerationRequest { goal, equipment[], difficulty, durationMinutes, horizon, daysPerWeek, focusAreas?, notes? }`
- `GeneratedPlan { title, goal, summary, horizon, daysPerWeek, routines: GeneratedRoutine[], generatedAt, model, request }`
- `GeneratedRoutine { name, difficulty, durationMinutes, exercises: WorkoutExercise[] }`
- `GenerationFailureCode = 'generation_limit_reached' | 'generation_failed' | 'transport_failure' | 'backend_unavailable'`
- `AppGenerationError` extends Error with `code`, `used?`, `limit?`, `retryable`

### marketplace.ts
- `TrainerPublicProfile { id, username, fullName, avatarUrl, bio, specialties[], certifications[], introVideo, experienceYears, ratingAvg, ratingCount }`
- `Review { id, trainerId, clientId, clientName, clientAvatar, rating, title, body, testimonialVideo?, createdAt }`
- `Invite { id, trainerId, inviteType, inviteValue, status, createdAt, acceptedAt }`
- `InviteType = 'username' | 'email' | 'phone'`

---

## 9. Config Reference

### featureGates.ts
```typescript
FEATURE_GATES = {
  ai_generation: { freeLimit: 3 },
  grouped_routine_authoring: {},
};
TRIAL_LENGTH_DAYS = 7;
FREE_CUSTOM_ROUTINE_LIMIT = 3;
```

### copy.ts — Centralized Copy Constants
- `PLAN_LABEL` / `PLAN_COLOR` — Per-source labels and colors
- `HEADERS` — Section header strings
- `BUTTONS` — Button labels
- `HELPER` — Helper/explanation text
- `EMPTY` — Empty state messages
- `CONFIRM` — Success confirmation strings
- `TRAINER_LOOP` — Trainer conversion loop copy (invite alerts, assign alerts, status labels)
- `CLIENT_NOTIF` — Client notification card copy
- `DAY_ROUTINE_REASON_LABEL` — Human-readable reason labels

### billing.ts
- Reads `EXPO_PUBLIC_BILLING_ENV`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`, `EXPO_PUBLIC_REVENUECAT_OFFERING_ID`, `EXPO_PUBLIC_REVENUECAT_EXPECTED_PRODUCT_IDS`, `EXPO_PUBLIC_REVENUECAT_EXPECTED_PACKAGE_IDS`
- Environment: `'test'` (default) or `'production'`

---

## 10. Database Schema

### Base Tables (schema.sql — 6 tables, deployed)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `profiles` | User profiles | id, full_name, email, role, avatar_url, bio, goal, created_at |
| `trainer_client_links` | Trainer↔client relationships | trainer_id, client_id, status (active/pending) |
| `programs` | Training programs | id, trainer_id, name, description, client_id? |
| `routines` | Workout routines in programs | id, program_id, name, difficulty, exercises_json |
| `assignments` | Routine assignments | id, trainer_id, client_id, routine_id, status, schedule_days, source |
| `completed_workouts` | Workout history | id, user_id, routine_name, exercises, duration, volume |

All tables have RLS enabled with `auth.uid()` policies.

### Phase 7C Migration (NOT APPLIED — `phase7c_hosted_repair.sql`, 283 lines)

5-part mega-migration:
1. **Marketplace/profile columns:** `username`, `specialties[]`, `certifications[]`, `intro_video`, `experience_years`, `is_public`, `rating_avg`, `rating_count`, `ai_generation_count`
2. **Phase 7C columns on programs:** `source`, `generation_metadata`, `trainer_endorsed_by`, `trainer_endorsed_at`
3. **Reviews table:** `reviews` (trainer_id, client_id, rating, title, body, testimonial_video)
4. **Invites table:** `invites` (trainer_id, invite_type, invite_value, status)
5. **RPCs:** `check_username_available`, `find_user_by_username`, `find_user_by_email`, `search_trainers`, `increment_ai_generation_count`
6. **RLS policies** for all new tables

### Phase 10 Migration (NOT APPLIED — `phase10_entitlements.sql`)

Entitlements infrastructure columns on profiles:
- `plan_tier`, `trial_started_at`, `trial_ends_at`, `admin_override`

### Edge Function (NOT DEPLOYED — `supabase/functions/generate-plan/index.ts`)

- Accepts `GenerationRequest`, calls OpenAI gpt-4o-mini
- Increments `ai_generation_count` on profiles
- Checks free limit (3) vs. premium/trial entitlement
- Requires `OPENAI_API_KEY` secret on Supabase

---

## 11. Session & Auth Architecture

### Boot Sequence (`useSession` hook, called from root layout)

1. **Restore session:** `getSession()` from Supabase
2. **Load profile:** `getProfile(user.id)` 
3. **Hydrate stores in parallel:**
   - `assignmentStore.hydrate(role, userId)`
   - `workoutStore.hydrateHistory(userId)`
   - `entitlementStore.hydrate(userId, role)`
4. **Subscribe:** `onAuthStateChange` for SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED

### Sign-out Cleanup

`clearUserScope({ clearPersisted: true })` in authStore resets:
- assignmentStore
- workoutStore
- entitlementStore

### Route Resolution (`app/index.tsx`)

```
loading → Spinner
!hasOnboarded → /onboarding
!isAuthenticated → /login
role === 'trainer' → /trainer/dashboard
else → /client/workout
```

---

## 12. Entitlement & Billing Architecture

### Flow

```
User signs in
  → entitlementStore.hydrate(userId, role)
    → ensureTrialRecord(userId)  [clients only — auto-starts 7-day trial]
    → syncBillingEntitlement(userId, record)
      → billingAdapter.isAvailable()
      → billingAdapter.configure(userId)
      → billingAdapter.getCustomerState()
      → applyBillingCustomerState(record, customerState)
    → resolveEntitlement(record, role)
      → returns ResolvedEntitlement { state, isPremium, isTrialActive, canUsePremiumFeatures }
```

### Entitlement States

| State | Meaning |
|-------|---------|
| `free` | Free tier, no trial active |
| `trial_active` | 7-day trial in progress |
| `premium_active` | Paid subscription active |
| `admin_override` | Admin-granted premium access |

### Feature Gates

- `ai_generation` — 3 free uses, then requires premium/trial
- `grouped_routine_authoring` — No free limit currently set

### Dev Override System

In `__DEV__` mode, `devEntitlementStore` allows testing all entitlement scenarios without real billing. Settings screen exposes scenario picker + mock generation toggle.

---

## 13. Weight Unit System

### Architecture

- **Storage:** All weights stored internally in **kg** (canonical unit)
- **Preference:** `preferencesStore.weightUnit` persisted in AsyncStorage
- **Display:** `units.ts` converts kg → display unit on render
- **Input:** `parseWeightInputToKg(value, unit)` converts user input → kg for storage

### Key Functions (`services/units.ts`)

| Function | Purpose |
|----------|---------|
| `convertKgToUnit(kg, unit)` | kg → display unit |
| `convertUnitToKg(value, unit)` | Display unit → kg |
| `formatWeightWithUnit(kg, unit)` | "45.0 kg" or "99.2 lb" |
| `formatVolumeWithUnit(volumeKg, unit)` | Volume display with unit |
| `parseWeightInputToKg(value, unit)` | Input string → kg number |
| `getWarmupWeightKg(workingWeightKg)` | 65% of working weight |
| `getWarmupReps(workingReps)` | 60% of working reps (min 4) |

---

## 14. Grouped Exercise System

### Types

- `WorkoutExerciseGroupType = 'single' | 'superset' | 'triset' | 'giantset'`
- Exercises share a `groupId` (UUID) and `groupType`
- `groupOrder` determines display order within group

### Components

- `ExerciseGroupCard.tsx` — Renders grouped exercises as a visual unit
- `ExerciseCard.tsx` — Individual exercise within a group or standalone
- `SetRow.tsx` — Individual set within an exercise

### In Routine Builder

Both client and trainer `create-routine.tsx` support:
- Adding exercises to groups
- Selecting group type (superset/triset/giantset)
- Draft persistence via `routineDrafts.ts`

---

## 15. Schedule Resolution System

### Priority Rules (`services/schedule.ts`)

1. **Manual override** — User explicitly selects a routine for a day → highest priority
2. **Trainer-assigned** — `source: 'trainer'` assignments (priority 2)
3. **Self/AI-assigned** — `source: 'self'` or `source: 'ai'` (priority 1)
4. **Tiebreaker** — Most recently assigned wins (`assignedAt` descending)

### Resolution Output

```typescript
ResolvedDayRoutine {
  day: DayOfWeek;
  activeRoutine: WorkoutRoutine | null;
  activeAssignment: Assignment | null;
  reason: 'manual_override' | 'coach_assigned' | 'self_scheduled' | 'ai_scheduled' | 'empty';
  candidates: Assignment[];
  isManualOverride: boolean;
}
```

---

## 16. Build Passes Completed

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 — Foundation | ✅ | Scaffold, theme, types, UI primitives, auth store, routing, all screens |
| Phase 2 — Supabase Integration | ✅ | Auth, schema, RLS, profile trigger, service layer |
| Phase 3 — Workout Engine | ✅ | workoutStore, live session, rest timer, history |
| Phase 4 — Trainer-Client System | ✅ | assignmentStore, client management, assignments, notifications, dashboard |
| Phase 5 — Marketplace | ✅ | Discover trainers, search, filter, trainer public profiles |
| Phase 6 — Programs & Routines | ✅ | Program list, routine detail, create program, assignment |
| Phase 7 — AI Generation | ✅ | 7A generate UI, 7B review UI, 7C Edge Function + migration (written, not deployed) |
| Phase 8 — Bug Fixes & Polish | ✅ | Duplicate key fix, interactive day picker, session staleness, filter polish, deploy runbook |
| App Simplification + Navigation Cleanup | ✅ | Post-Phase 8 hardening pass |
| Visual Language + Digital Workout Journal | ✅ | Summary hero stats, recap rows, achievements, reflection sheet |
| Trainer Workflow Maturity | ✅ | Trainer screen improvements (5 files) |
| Trainer Conversion Loop + Beta Hardening | ✅ | copy.ts centralization, invite alerts, assign alerts, status labels (5 files) |
| Entitlement & Billing Architecture | ✅ | Adapter pattern, RevenueCat, trial system, feature gates, dev scenarios |
| Unit Preferences (kg/lb) | ✅ | preferencesStore, units.ts, WeightUnitToggle |

---

## 17. Deployment Status

| Component | Written | Applied/Deployed |
|-----------|---------|-----------------|
| Base schema (6 tables + RLS) | ✅ | ✅ Live |
| Phase 7C migration (marketplace, reviews, invites, RPCs) | ✅ | ❌ NOT applied |
| Phase 10 migration (entitlements columns) | ✅ | ❌ NOT applied |
| generate-plan Edge Function | ✅ | ❌ NOT deployed |
| OPENAI_API_KEY secret | — | ❌ NOT set |
| RevenueCat API keys | — | ❌ NOT configured |
| EAS Build | — | ❌ No production build |

### Deploy Runbook

See `docs/deploy-runbook-phase8.md` for step-by-step instructions.

Quick sequence:
1. Apply Phase 7C migration → `supabase db push` or SQL editor
2. Apply Phase 10 migration → `supabase db push` or SQL editor
3. Set secrets → `supabase secrets set OPENAI_API_KEY=...`
4. Deploy Edge Function → `supabase functions deploy generate-plan`
5. Set RevenueCat env vars in `.env` (when ready for billing)

---

## 18. Known Issues & Gotchas

### IDE False Positives
VS Code may show `--jsx` TypeScript errors. These are **false positives**. Always verify:
```bash
npx tsc --noEmit  # Should show 0 errors
```

### Entitlement Column Fallback
`services/entitlements.ts` gracefully handles missing `plan_tier`/`trial_started_at`/etc. columns by falling back to AsyncStorage. This ensures the app works before Phase 10 migration is applied.

### Generation Backend Check
`services/generation.ts` proactively checks for missing `ai_generation_count` column before calling the Edge Function. Shows a clear "backend not ready" error if migrations aren't applied.

### Mock Generation in Dev
When `__DEV__` and `devEntitlementStore.mockGenerationEnabled` is true, `generatePlan()` returns a deterministic mock plan instead of calling the Edge Function. This enables offline development.

### Weight Storage Convention
All weights are stored in **kg** regardless of user preference. Display conversion happens at render time via `units.ts`. Any new weight display must use `formatWeightWithUnit()` or `formatVolumeWithUnit()`.

### Store Hydration Order
`useSession` hydrates assignmentStore, workoutStore, and entitlementStore in parallel after auth. The `clearUserScope` action on authStore ensures all stores are reset on sign-out to prevent data leaks between users.

---

## 19. What's Next (Phase 9+)

### Pending Deployment
- [ ] Apply Phase 7C migration to Supabase
- [ ] Apply Phase 10 migration to Supabase
- [ ] Set OPENAI_API_KEY secret
- [ ] Deploy generate-plan Edge Function

### Deferred Features
- [ ] Real-device end-to-end testing
- [ ] Push notifications (expo-notifications)
- [ ] Analytics & crash reporting
- [ ] App Store / Play Store submission
- [ ] RevenueCat production setup (API keys, products, offerings)
- [ ] Biometric authentication (expo-local-authentication)
- [ ] OTP verification backend
- [ ] Social login providers (Google, Apple)
- [ ] Image/avatar upload (Supabase Storage)
- [ ] Offline-first with conflict resolution
- [ ] Performance profiling (large routine lists, workout history)
