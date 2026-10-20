# Web verification — October 13, 2026

## Result

The local web implementation passes **42 automated tests**: 17 backend tests, 10 member reliability tests and 15 browser acceptance tests. TypeScript, formatting and the web export pass. This verifies the local web milestone; it is not a production or native-device certification.

Environment: macOS ARM64, Node 23.11.0, Yarn 4.4.1, Expo SDK 54, Playwright 1.64.0 with Chromium. Server/browser tests used disposable isolated data; the interactive workspace was not used as test fixtures.

| Check | Actual result |
| --- | --- |
| `yarn typecheck` | Pass |
| `yarn test:server` | 17 passed, 0 failed |
| `yarn test:member` | 10 passed, 0 failed; test source is transpiled using TypeScript, without requiring native Node TS support |
| `yarn web:build` | Pass |
| Build with `EXPO_NO_DOTENV=1` and both Supabase public environment variables unset | Pass; final browser bundle `entry-a0496f470e1a5e37931e90da68cdaf73.js`, approximately 2.28 MB uncompressed |
| `yarn playwright test` against that no-credentials build | 15 passed in 19.5 seconds |
| Role navigation checks | All 9 member pages and 7 trainer pages render; zero browser exceptions and zero nonlocal network attempts |
| Mobile browser checks | 390px layout has no horizontal overflow on checked member pages; keyboard sign-in/navigation and hidden-drawer focus behavior pass |
| Nested dialogs | Escape closes only the confirmation and restores focus to the underlying workout; parent session remains open |
| Development launcher | API on 8094 and Expo on 8093 returned HTTP 200; SIGTERM stopped both, leaving neither port listening |
| `yarn format:web:check` and `git diff --check` | Pass |

## Verified journeys

- Browser registration starts empty; trainer/member sessions remain independent, including across reloads.
- Coaching invitation stays pending until recipient consent. Accepted member completes an assigned workout, trainer reviews it, member sees feedback, both exchange messages, and disconnection removes coach access while retaining the member's journal.
- Trainer creates multiple routines, assigns distinct weekdays, and deletes a source program without deleting assignment snapshots.
- Workout pause/reload/resume, decimal load input, rest/duration handling, reflection, completion and recurrence work. Completing one date leaves the next date available.
- A failed completion remains in a durable owner-specific outbox. Logging into another account does not replay it. Returning to its owner delivers it once.
- Local plan generation creates an editable unsaved template. Private/shared visibility is enforced and editing invalidates revision-specific endorsement.
- Profile/settings persist; account export excludes other users' records/secrets; password change and explicit account deletion work.

Backend tests additionally exercise malformed payloads, direct unauthorized mutations, pending/revoked consent, private program visibility, feedback ownership, concurrent idempotent retries, disk-write failure rollback, historical preservation, deletion anonymization, whitespace-password handling, invalidated/invalid sessions, origin/host/path protections, request limits, store locks and schema rejection.

## Issues found and resolved during integration

- Legacy Zustand `import.meta` prevented the first browser bundle from parsing. The web Expo Babel transform now lowers it.
- A native RevenueCat import initialized a Stripe script on the web. The web billing adapter now returns explicit unavailability without importing the payment SDK.
- Legacy Supabase imports depended on environment configuration even though the web UI uses its own API. A web-specific guard disables hosted auth/persistence and rejects accidental legacy HTTP calls locally. Native adapters are unchanged.
- Cancelling future assignments changed historical missed/skipped dates. Historical status is now preserved.
- Other connected coaches could overwrite feedback. Assigning-coach and feedback-author rules now prevent this.
- Private member programs were exposed to coaches despite the UI visibility setting. Only intentionally shared plans are projected for review.
- Profile equipment display labels did not match generation identifiers. Canonical identifiers and defensive normalization now align both paths.
- Nested modal listeners and hidden mobile navigation interfered with keyboard focus. Topmost-dialog handling and mobile visibility/focus management now pass browser regressions.
- Stale state responses or exports could arrive after account changes. Identity and response-order guards prevent applying them to a different active session.

## Screenshots

These are actual browser captures of fictional demo data from the final no-credentials build:

- [Sign in](web-preview/sign-in.png)
- [Member workspace](web-preview/member.png)
- [Trainer workspace](web-preview/trainer.png)
- [Member at phone width](web-preview/member-mobile.png)

Desktop member/trainer and phone-width layouts were visually inspected for readable content, spacing and clipping. Playwright's detailed local HTML report is in `playwright-report/index.html`; traces and report output are intentionally ignored by Git.

## Remaining boundaries

Hosted Supabase, real AI generation, payment processing, email verification/recovery, push and public hosting are not activated. The plan studio currently uses local templates. Native iOS/Android adaptation, dependency alignment, device tests and distribution remain pending in [mobile validation](mobile-validation.md). The earlier dependency audit remains a release input; this iteration does not claim all original dependency findings are remediated.

The store is a single-process local implementation. No load, distributed deployment, public-service penetration, screen-reader certification or non-Chromium browser certification is claimed. See [the handoff](web-first-handoff.md) for the exact completion map and transition gates.
