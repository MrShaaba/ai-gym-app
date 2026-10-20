# Browser acceptance suite

The Playwright suite exercises the exported Expo browser application and the real local Node API together. Test accounts and workout data are written to a unique disposable directory under `.local-web-test/`; interactive demo data in `.local-web/` is never used. Tests run against `127.0.0.1:8095` by default. Set `AI_GYM_E2E_PORT` if that port is occupied.

```sh
yarn web:build
yarn playwright install chromium
yarn playwright test
yarn playwright show-report
```

The static export must be rebuilt after browser source changes. The test runner starts and stops its own API server. Do not start the interactive server on the test port. Screenshots, video, and traces are retained for failed tests. Individual acceptance tests may create an API fixture, but the behavior under test is exercised through accessible browser controls.

## Browser release gates

- Trainer and member sign-in, independent account state, and empty onboarding for new accounts.
- Trainer requests consent; private member history stays unavailable until acceptance.
- Program creation, exercise prescriptions, explicit weekday-to-routine scheduling, and future occurrences.
- Workout start, decimal weight entry, pause/resume, browser reload, completion, reflection, and journal review.
- Failed completion requests retain the member's pending workout and recover without duplicate history.
- Trainer review of a completed workout and feedback visible to the member.
- Settings persistence, password handling, account data export, and responsive keyboard-accessible navigation.

The application server's separate Node tests own request validation, authorization, idempotency, schema-version rejection, and persistence regression coverage. Browser assertions complement those tests rather than replacing the security suite.

| Test file            | Acceptance focus                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts`       | Browser registration, member/trainer session isolation, empty accounts, keyboard sign-in, 390px layout                                    |
| `account.spec.ts`    | Persistent preferences, account JSON export, password change, explicit deletion                                                           |
| `coaching.spec.ts`   | Invitation and consent, assigned workout, reflection, feedback, messaging, and removal of access after disconnect                         |
| `programs.spec.ts`   | Routine editor, distinct weekday mapping, preserved snapshots after deletion, local generation, sharing and revision-specific endorsement |
| `workout.spec.ts`    | Pause/reload/resume, decimals, date recurrence, failed-save outbox, owner isolation, restart and cancellation                             |
| `navigation.spec.ts` | All role-allowed pages render without browser exceptions; dashboard screenshots attached to the report                                    |

## Deferred real-device acceptance (not executed)

These are explicit future verification placeholders. Browser tests and mobile-sized browser viewports do **not** establish native readiness.

| Area                             | iOS physical device  | Android physical device | Acceptance evidence required                                                                                    |
| -------------------------------- | -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Installation and initial session | Pending              | Pending                 | Signed build opens, account access works, secure token storage confirmed                                        |
| Workout lifecycle                | Pending              | Pending                 | Start/pause/resume/cancel/restart/finish, background/foreground, process kill and relaunch                      |
| Offline recovery                 | Pending              | Pending                 | Airplane-mode completion retained, reconnect delivers once, account switch never replays another member's draft |
| Timing and interrupts            | Pending              | Pending                 | Rest/session timers after screen lock, calls, power-saving mode, and timezone change                            |
| Accessibility                    | Pending              | Pending                 | VoiceOver/TalkBack, large text, focus order, minimum touch targets, decimal keyboard                            |
| Notifications                    | Deferred integration | Deferred integration    | Real device permission prompt, denial, push delivery, deep link destination                                     |
| Device integrations              | Deferred integration | Deferred integration    | HealthKit/Health Connect and biometrics tested only if activated                                                |
| Distribution                     | Deferred hosting     | Deferred hosting        | TestFlight/internal testing, crash reporting, release signing and recovery runbook                              |

Hosted Supabase, hosted AI, payments, email delivery, and operating-system integrations require their own adapter and deployment validation. This suite establishes local web behavior only.
