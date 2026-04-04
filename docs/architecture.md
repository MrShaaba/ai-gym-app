# Architecture — AI Gym App

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (managed) | SDK 54 |
| UI | React Native | 0.81.5 |
| Language | TypeScript | 5.9.2 |
| Routing | expo-router | 6.0.23 |
| State | Zustand | 5.0.12 |
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
│   ├── _layout.tsx      # Bottom Tabs (4 tabs)
│   ├── workout.tsx      # Weekly calendar, routines
│   ├── programs.tsx     # Program list, difficulty badges
│   ├── statistics.tsx   # Stat cards, recent PRs
│   └── profile.tsx      # Measurements, activity, sign-out
├── (trainer)/
│   ├── _layout.tsx      # Bottom Tabs (4 tabs)
│   ├── dashboard.tsx    # Stats grid, today's sessions
│   ├── clients.tsx      # Active/inactive client list
│   ├── programs.tsx     # Programs with assignments
│   └── profile.tsx      # Trainer stats, sign-out
└── (shared)/
    ├── _layout.tsx      # Modal Stack
    ├── subscription.tsx # Paywall placeholder
    └── settings.tsx     # Preferences, sign-out

```

## State Management

```
authStore (Zustand)
├── isAuthenticated: boolean
├── role: 'client' | 'trainer' | null
├── hasOnboarded: boolean
├── login(role) → sets authenticated + role
├── logout() → clears state
└── completeOnboarding() → sets hasOnboarded
```

## Navigation Flow

```
App Launch
  → hasOnboarded? No → (auth)/onboarding
  → isAuthenticated? No → (auth)/login
  → role === 'trainer'? → (trainer)/dashboard
  → else → (client)/workout
```

## Design System

- **Background:** #0D0D0D
- **Surface:** #1A1A1A
- **Card:** #1E1E1E
- **Accent:** #4ADE80 (green)
- **Text Primary:** #FFFFFF
- **Text Secondary:** #A1A1AA
- **Border:** #2A2A2A

## Feature Flags

All features gated via `config/constants.ts` FEATURES object. In Phase 1, all flags are `false`:

```ts
FEATURES = {
  AI_WORKOUT: false,
  CHAT: false,
  VOICE_COACHING: false,
  PAYMENTS: false,
  SOCIAL: false,
}
```