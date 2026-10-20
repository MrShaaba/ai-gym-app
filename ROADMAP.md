# Roadmap

AI Gym works end to end on one machine today. The goal is a dependable coaching app that a small group of trainers and their existing clients can use across devices, then native iOS/Android builds. Detailed acceptance criteria live in [docs/completion-roadmap-2026-10-13.md](docs/completion-roadmap-2026-10-13.md). Each item below maps to a GitHub issue.

## Now: web iteration hardening

- [ ] Add CI that runs typecheck, API/domain tests, the Playwright suite and a Prettier check on every push
- [ ] Fix the workspace sidebar clipping at short viewport heights (visible in `docs/web-preview/member.png`)
- [ ] Paginate and date-filter workout history beyond 50 sessions, with correct aggregate totals
- [ ] Personal records and per-exercise trends that ignore warm-up sets and respect measurement type
- [ ] Accessibility pass: keyboard paths, focus order, labels and contrast across both workspaces

## Next: reliable data across devices

- [ ] Reconcile the Supabase schema: ordered migrations that build a blank database and upgrade an existing one, plus generated types
- [ ] Consent-based trainer/member relationships enforced by row-level security, with policy tests for allowed and denied access
- [ ] Dated workout occurrences with recurrence, timezone and DST handling, replacing global assignment status
- [ ] Port the web outbox to native: stable session IDs, durable pending work, visible sync state, idempotent completion
- [ ] Persistent notification inbox with read state that repairs missed events on reconnect

## Then: complete the coaching loop

- [ ] Trainer program lifecycle: drafts, published revisions, duplicate, archive; editing future work never changes past results
- [ ] Trainer review queue showing planned vs actual sets, member reflections and replies
- [ ] Member intake (goals, experience, equipment, availability) feeding a suitable starting plan

## Later

- [ ] Bounded AI plan suggestions: strict schemas for goal, equipment, units and ranges; malformed output rejected; the member edits and the trainer approves a specific revision
- [ ] Usage limits, cost controls and a kill switch for plan generation
- [ ] Native release: real-device testing, crash reporting, privacy and support pages, App Store and Play Store submission
- [ ] Optional: subscriptions and public trainer discovery, only once the core loop has real repeat use

## Done

- Native app shell, Supabase auth and schema, workout engine, trainer assignments, marketplace screens (April 2026)
- Assignment lifecycle sync and cleanup on program deletion (May 2026)
- Web-first iteration: local API with durable storage, member and trainer workspaces, scheduling with conflict review, durable drafts and outbox, coaching feedback, messages, progress charts, Playwright coverage (October 2026)
