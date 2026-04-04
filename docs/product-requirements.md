# Product Requirements Document — AI Gym App

## Vision

A mobile-first fitness platform that combines AI-powered workout programming with real trainer oversight, enabling clients to train smarter and trainers to scale their coaching.

## Target Users

### Client
- Gym-goer who wants structured programs
- Values tracking progress, streaks, and PRs
- May or may not work with a trainer

### Trainer
- Certified personal trainer managing multiple clients
- Needs tools to create programs, track client progress, and communicate
- Wants to scale beyond in-person sessions

## Core Features (by Phase)

### Phase 1 — Foundation (MVP)
- Role-based onboarding (client or trainer)
- Mock auth flow (login, register, OTP, biometric)
- Client: workout view, programs, statistics, profile
- Trainer: dashboard, client list, programs, profile
- Subscription paywall placeholder
- Settings with sign-out

### Phase 2 — Core
- Exercise database with muscle/equipment filters
- Workout logging (sets × reps × weight)
- Real authentication (OAuth + email)
- Backend API + persistent storage
- Chart-based statistics

### Phase 3 — AI & Social
- AI workout generation
- AI program builder
- Trainer-client messaging
- Voice coaching
- Progress photos

### Phase 4 — Monetization
- Subscription payments (RevenueCat)
- Push notifications
- App Store submission

## Non-Functional Requirements

- Dark theme throughout (matches sample screenshots)
- Performant on iOS and Android
- Offline-first where possible (Phase 2+)
- Accessible (contrast ratios, screen reader labels)