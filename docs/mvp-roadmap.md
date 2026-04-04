# MVP Roadmap

## Phase 1 — Foundation ✅

**Goal:** Shippable app shell with routing, screens, mock auth, and dark theme.

| Category | Deliverable | Status |
|----------|-------------|--------|
| Config | Theme tokens, constants, feature flags | ✅ |
| Types | User, Workout domain models | ✅ |
| UI | Screen, Button, Card, Input, TabBarIcon | ✅ |
| State | Zustand auth store, secure storage | ✅ |
| Auth | Onboarding, login, register, OTP, biometric | ✅ |
| Client | Workout, Programs, Statistics, Profile | ✅ |
| Trainer | Dashboard, Clients, Programs, Profile | ✅ |
| Shared | Subscription, Settings | ✅ |
| Docs | README, TASKS, AGENTS, PRD, architecture | ✅ |

## Phase 2 — Core Features

**Goal:** Real data, real auth, workout logging.

- Exercise database with search/filter by muscle group and equipment
- Workout logging with sets, reps, weight
- Real authentication (Google, Apple, email+password)
- Backend API (REST or tRPC) + database
- Chart-based statistics (victory-native)

## Phase 3 — AI & Social

**Goal:** AI-powered programming and trainer-client communication.

- OpenAI/Claude integration for workout generation
- AI program builder (goal → periodized program)
- In-app messaging between trainer and client
- Voice coaching (text-to-speech cues)
- Progress photo tracking

## Phase 4 — Monetization & Polish

**Goal:** Revenue, distribution, and production hardening.

- RevenueCat subscription integration
- Push notifications (expo-notifications)
- App Store / Play Store submission
- Analytics (PostHog or Amplitude)
- Crash reporting (Sentry)