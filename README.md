# AI Gym App

AI-powered gym & workout mobile app built with Expo, React Native, and TypeScript.

## Tech Stack

- **Expo SDK 54** — managed workflow, cross-platform
- **React Native 0.81** + **React 19** — new architecture
- **TypeScript 5.9** — strict mode, path aliases
- **expo-router 6** — file-based routing
- **Zustand 5** — minimal auth/role state

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

## Project Structure

```
app/
  (auth)/       # Onboarding, login, register, OTP, biometric
  (client)/     # Workout, programs, statistics, profile
  (trainer)/    # Dashboard, clients, programs, profile
  (shared)/     # Subscription, settings (modal stack)
components/
  ui/           # Screen, Button, Card, Input
  navigation/   # TabBarIcon
config/         # Theme tokens, constants, feature flags
store/          # Zustand auth store
services/       # Secure storage helpers
types/          # User, workout domain types
docs/           # PRD, roadmap, architecture
```

## Navigation

- **Root** — Stack navigator routes to auth/client/trainer/shared groups
- **Auth** — Headerless stack: onboarding → login → register → OTP → biometric
- **Client** — Bottom tabs: Workout, Programs, Statistics, Profile
- **Trainer** — Bottom tabs: Dashboard, Clients, Programs, Profile
- **Shared** — Modal stack: Subscription, Settings

## Phase 1 Scope

This is the Phase 1 MVP foundation — app shell, routing, screen structure, shared UI, mock auth, and role-aware navigation. No real backend, payments, or AI integrations.

See [docs/mvp-roadmap.md](docs/mvp-roadmap.md) for the full roadmap.