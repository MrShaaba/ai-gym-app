# Architecture — AI Gym App

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (managed) | SDK 54 |
| UI | React Native | 0.81.5 |
| Language | TypeScript | 5.9.2 |
| Routing | expo-router | 6.0.23 |
| State | Zustand | 5.0.12 |
| Backend | Supabase | JS v2.101.1 |
| AI | OpenAI (gpt-4o-mini) | via Edge Function |
| Storage | expo-secure-store | ~14.2.3 |
| Biometrics | expo-local-authentication | ~15.0.2 |

## File-Based Routing

```
app/
├── _layout.tsx          # Root Stack (providers, status bar)
├── index.tsx            # Entry redirect (auth state → role route)
├── +not-found.tsx       # 404 fallback
├── (auth)/
│   ├── _layout.tsx      # Headerless Stack
│   ├── onboarding.tsx   # Slide intro → login
│   ├── login.tsx        # Email/password + social
│   ├── register.tsx     # Name, email, password, role
│   ├── otp-verify.tsx   # 6-digit code input
│   └── biometric-setup.tsx  # Face ID/fingerprint opt-in
├── (client)/
│   ├── _layout.tsx      # Bottom Tabs (5 tabs)
│   ├── workout.tsx      # Weekly calendar, assigned routines, start workout
│   ├── programs.tsx     # Program list, drill-down to routines
│   ├── statistics.tsx   # Stat cards, workout history
│   ├── profile.tsx      # Measurements, activity, sign-out
│   ├── discover.tsx     # Marketplace: search/filter public trainers
│   └── generate.tsx     # AI workout generation (goal, equipment, duration)
├── (trainer)/
│   ├── _layout.tsx      # Bottom Tabs (4 tabs)
│   ├── dashboard.tsx    # Stats grid, today's sessions
│   ├── clients.tsx      # Active/inactive client list
│   ├── programs.tsx     # Programs with assignments
│   ├── profile.tsx      # Trainer stats, sign-out
│   └── assign.tsx       # Assign routines to clients
├── (workout)/
│   ├── _layout.tsx      # Stack (workout session)
│   ├── session.tsx      # Active workout: set logging, exercise nav
│   ├── exercise.tsx     # Exercise detail (sets, rest timer)
│   └── complete.tsx     # Workout summary
└── (shared)/
    ├── _layout.tsx      # Modal Stack
    ├── settings.tsx     # Preferences, sign-out
    └── review-plan.tsx  # AI-generated plan review (accept/edit/regenerate)
```

## State Management

```
authStore (Zustand — NOT persisted)
├── session: Session | null
├── profile: Profile | null
├── loading: boolean
├── setSession() / setProfile() / setLoading()
└── logout() → resets auth + workoutStore + assignmentStore

workoutStore (Zustand — persisted to 'workout-storage')
├── activeSession: ActiveSession | null
├── history: CompletedWorkout[]
├── restTimerEnd: number | null
├── startWorkout() / cancelWorkout() / finishWorkout()
├── updateSet() / toggleSetComplete() / addSet() / removeSet()
├── startRestTimer() / clearRestTimer()
├── hydrateHistory(userId) → fetches from Supabase
└── reset() → clears all local state

assignmentStore (Zustand — persisted to 'assignment-storage')
├── assignments: Assignment[]
├── notifications: ClientNotification[]
├── hydrating: boolean
├── hydrate(role, userId) → fetches from Supabase
├── createAssignment() / updateAssignmentStatus()
├── getClientAssignments() / getUnreadCount()
├── markNotificationRead() / markAllNotificationsRead()
└── reset() → clears all local state
```

## Auth & Session Flow

```
App Launch
  → useSession hook restores Supabase session
  → Fetches profile from DB
  → Resets persisted stores, then hydrates fresh data
  → Routes based on role (client → workout, trainer → dashboard)

Sign-In Event
  → Reset workoutStore + assignmentStore (clear stale data)
  → Fetch profile → hydrate stores with new user data

Sign-Out Event
  → authStore.logout() → resets all 3 stores
```

## Database (Supabase Postgres)

6 tables with RLS:

| Table | Purpose |
|-------|---------|
| profiles | User profiles (extends auth.users) |
| trainer_client_links | Trainer ↔ Client relationships |
| programs | Workout programs (trainer-created or AI-generated) |
| routines | Routines within programs (exercises JSON) |
| assignments | Routine assignments with schedule days |
| completed_workouts | Workout history log |

Pending migrations: marketplace columns (username, specialties, is_public, etc.), AI generation columns (source, generation_metadata).

## AI Generation Architecture

```
Client → generate.tsx (form) → Edge Function (generate-plan)
  → OpenAI gpt-4o-mini → structured JSON program
  → review-plan.tsx (accept/edit/regenerate)
  → programs service: createFromAI() → DB insert
```

## Design System

- **Background:** #0D0D0D
- **Surface:** #1A1A1A
- **Card:** #1E1E1E
- **Accent:** #4ADE80 (green)
- **Text Primary:** #FFFFFF
- **Text Secondary:** #A0A0A0
- **Text Muted:** #666666
- **Border:** #2A2A2A
- **Danger:** #EF4444 (NOT `error`)

Theme tokens in `config/theme.ts`. No `colors.error` or `colors.surfaceAlt`.