# Agent Instructions — AI Gym App

## Project Context

This is an Expo React Native TypeScript mobile app for AI-assisted gym training. It uses file-based routing via expo-router with role-aware navigation (client vs trainer).

## Architecture Rules

- **Expo managed workflow** — no native code modifications
- **expo-router** — all screens live in `app/` as file routes
- **Zustand** — only for auth/role state; keep stores minimal
- **Dark theme** — all screens use tokens from `config/theme.ts`
- **Path aliases** — use `@/` prefix (maps to project root)

## Conventions

- Components use `StyleSheet.create()`, no inline styles
- Shared UI in `components/ui/`, composed into screens
- Type definitions in `types/`, one file per domain
- Feature flags in `config/constants.ts` (all disabled in Phase 1)
- No real API calls in Phase 1 — use inline mock data
- No `any` types — use proper interfaces from `types/`

## Route Groups

| Group | Role | Layout | Purpose |
|-------|------|--------|---------|
| `(auth)` | All | Stack | Onboarding, login, registration |
| `(client)` | Client | Tabs | Workout, programs, stats, profile |
| `(trainer)` | Trainer | Tabs | Dashboard, clients, programs, profile |
| `(shared)` | All | Stack (modal) | Subscription, settings |

## Do NOT

- Add backend/API integration (Phase 2)
- Install chart libraries (Phase 2)
- Add real payment processing (Phase 4)
- Modify `App.tsx` (unused, expo-router handles entry)
- Over-engineer — keep Phase 1 lean