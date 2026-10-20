# AI Gym: end-to-end audit

**Audit date:** October 13, 2026 · **Branch:** `feat/a1-reliability` · **Commit:** `f99c24d`

Companion: [Completion roadmap and acceptance criteria](completion-roadmap-2026-10-13.md).

## Assessment

AI Gym has a substantial product foundation: two role-specific apps, a sophisticated strength-workout editor, grouped exercises, warmups, local workout sessions, summaries, Supabase services, AI generation, and a billing adapter. This work is worth retaining.

It is **not ready for a public launch or a dependable trainer/member beta**. The biggest gaps concern authorization, authentication, durable workout recording, recurring schedules, and the trainer feedback loop. Adding more screens before repairing those foundations would multiply inconsistent behavior.

The central product promise should be demonstrable across two accounts and devices:

**A trainer and member agree to work together → trainer prescribes a plan → member receives and understands it → member completes training, including offline → trainer sees the actual results and reflection → trainer responds and adjusts future training.**

The repository currently contains pieces of every step, but does not reliably connect them. “Feature complete through Phase 8” in the historical handoff is not supported by the present implementation. A numerical percentage complete would be misleading because the target scope is not fixed and deployment/runtime evidence is incomplete.

## Scope and confidence

Reviewed the repository instructions, README, handoff, task list, existing PRD/roadmap/architecture, route groups, member and trainer screens, services, stores, hooks, domain types, shared controls, SQL schema and migrations, AI function, billing, and build configuration. Dedicated member, trainer, and backend/security reviews were reconciled into this report.

Evidence labels:

- **Source-confirmed:** the implementation or a missing dependency is visible in the checked-in code.
- **Locally reproduced:** actual application modules executed with synthetic inputs and controlled service mocks; no hosted data or paid model requests involved.
- **Unverified:** hosted schema/policies, configured products/secrets, deployed function, native device behavior, or business assumptions requiring observation.

No application code, database, deployment, subscriptions, or accounts were changed. Only audit documents/evidence were added. The existing modified `.yarn/install-state.gz` was preserved. Source line references describe the audited commit and may move after implementation.

### Checks performed

| Check | Result | What this establishes |
|---|---|---|
| `yarn exec tsc --noEmit` | Passed, exit 0 | Current app TypeScript compiles. Deno function is intentionally excluded. |
| `yarn exec expo export --platform all --output-dir /tmp/ai-gym-audit-export-20261013` | Passed for iOS, Android, web | JS/assets bundle for all three targets. This is not a native build or device test. |
| `yarn exec expo install --check` | Failed, exit 1; eight compatibility mismatches | Dependency alignment work is required; see A25. |
| `yarn npm audit --all --recursive --json` | Exit 1; 101 reported entries across 27 packages | Dependency advisories/deprecations need exposure triage. Not proof of 101 exploitable app vulnerabilities. |
| Actual schedule resolver with a Mon/Wed/Fri assignment | Before completion: all three `coach_assigned`; after completion: all three `empty` | One completion removes all recurrence days. |
| Actual workout store, failed insert then server-history hydration | Local history count 1, active session null; after hydrate count 0 | Unsynced completed workouts are discarded. Persistence middleware bypassed for this isolated test; process death itself was not tested. |
| Actual unit helpers simulating controlled input typing `22.5` | Display sequence `2 → 22 → 22 → 225` | Immediate numeric formatting discards the decimal separator. Physical keyboard behavior still needs device QA. |
| Actual AI handler with invalid model object | Returned HTTP 200 with no valid workout-plan structure | JSON parsing is being treated as schema validation. |
| Actual AI handler with failed profile lookup and failed quota RPC | Returned HTTP 200 and called model stub | Entitlement/usage failures do not stop generation. |
| Actual AI handler, five concurrent calls with count 2/free cap 3 | Five HTTP 200 responses and five provider calls | Quota check and increment are not an atomic reservation. |
| Local web server | Started; web bundle succeeded | Browser runtime reported no available browsers, so navigation/visual smoke test was not performed. Server stopped after audit. |
| iOS simulator/tooling | No booted simulator; Deno CLI unavailable | Native execution and Deno runtime/type checks remain outstanding. |

Dependency report: [raw audit snapshot](audits/2026-10-13/dependency-audit.jsonl). It contains 4 low, 31 moderate, 64 high, and 2 critical entries, including repeated advisories for different version ranges and deprecation notices. There are 79 distinct advisory URLs. Critical-labeled entries concern `shell-quote@1.8.3` and `tar@7.5.13`; several findings are in development/build tooling. Runtime reachability and available compatible fixes were not exhaustively assessed.

The hosted Supabase database was not queried. Historical documents saying a migration is “deployed” or “pending” are not treated as current deployment evidence. No full two-account end-to-end run, database reset, purchase, push delivery, or real AI generation was claimed.

## Capability inventory

“Implemented” below means code exists and is wired locally; it does not imply production verification. Most larger capabilities are partial because their failure paths or cross-device lifecycle remain incomplete.

### Member experience

| Capability | Current state | Completion gap |
|---|---|---|
| Email/password account | Wired; lifecycle defective | Loading ownership, confirmation/recovery, refresh, failure recovery, guarded routes |
| Intro onboarding | Marketing slides implemented | Goals, experience, available equipment, schedule, constraints, first-plan setup |
| Google/Apple/OTP/biometrics | Incomplete | Social buttons lead to OTP stub; biometric prompt does not implement subsequent unlock |
| Workout logging | Broad implementation | Durable writes, validated input, safe cancellation, partial-session policy |
| Grouped exercises/warmups | Implemented | Preserve all prescriptions and support reliable recovery |
| Pause/resume/restart | Implemented locally | Owner isolation, timer restoration, process-death/device testing |
| Custom routines | Create/edit/delete, drafts, groups | Reorder/duplicate, per-set prescriptions, richer instructions and substitutions |
| Saved programs | Partial | Program/routine detail, full preview, edit/copy/archive owned AI/self plans |
| Weekly schedule | Partial; incorrect recurrence | Dated occurrences, routine/day mapping, skip/reschedule, conflict handling |
| AI generation/review | UI and function exist | Strict validation, quota integrity, editable review, transactional save, verified deployment |
| Summary/reflection/history edits | Implemented locally | Complete server round trip, visible pending state, immutable attribution |
| Progress | Basic recent totals/PR helpers | True totals, full history, date filters, exercise trends and progression |
| Trainer discovery/request | Partial | Missing repository RPCs, acceptance/status/disconnect lifecycle |
| Assignment notifications | Local scaffold | Recipient delivery, read state, live/reconnect updates, optional push |
| Profile/settings/support | Mostly incomplete | Account editing, useful settings, help/privacy/terms, export/deletion |
| Accessibility | Explicit support largely absent | Screen readers, touch targets, keyboard, large text, contrast/device checks |

### Trainer experience

| Capability | Current state | Completion gap |
|---|---|---|
| Trainer account/profile | Basic registration/editing | Guided setup, profile preview/media, credential claims policy |
| Existing-client lookup/link | Wired, insecure consent model | Recipient acceptance, role checks, pending state and revocation |
| New-client invitations | Deliberately unsupported in current UI | Later delivery/deep links/expiry/resend if growth scope is selected |
| Incoming member requests | Incomplete | Pending inbox, accept/decline, meaningful client-visible status |
| Client roster | Partial | Search/filter, relationship lifecycle, intake/goals, private notes, pagination |
| Program authoring | Create/list/delete | Edit, duplicate, version/archive, weeks/phases/progression, visibility |
| Routine authoring | Substantial builder | Trainer drafts, edit/reorder/duplicate, richer prescriptions/custom exercises |
| Assignment | One routine/client/weekdays | Date range, occurrence model, edit/reschedule, conflict preview, idempotency |
| Dashboard | Counts and active assignments | Requests, due/missed sessions, check-ins and actionable review queue |
| Review member results | Mostly absent | Actual completed sets/weights, planned versus actual, reflection, trends |
| AI endorsement | Button and update service | Read full plan, edit/comment, authorize approval and bind it to a revision |
| Communication | Assignment note only | Member replies, check-ins, feedback; later full messaging/form review |
| Public reviews | Display/service partial | Submission UI, eligible reviewers, aggregation, report/moderation |
| Commercial coach operations | Missing | Packages, booking, coaching payments, payouts/refunds, admin support; separate from app subscription |

The static exercise library contains 27 exercises. That can support a narrow beta, but does not support a claim of a comprehensive training library.

## Findings and recommended corrections

Priority definitions: **P0** blocks admitting real users to the affected flow; **P1** blocks a dependable core release; **P2** is a material usability, accuracy, maintainability, or expansion issue. A disabled optional feature can remain deferred; displaying it as functional cannot.

### A01 — P0: A caller can activate their own access to another member

`supabase/schema.sql:59` permits all link operations when `trainer_id = auth.uid()`. It checks neither trainer role nor recipient acceptance. Active links authorize profile and workout-history reads at `:37` and `:182`. `services/trainer.ts:138` and `app/(trainer)/invite-client.tsx:66` use this unilateral activation in the normal flow.

Under the repository policies, a caller who knows another profile ID can create an active relationship and obtain its allowed private data. This is a policy finding, not a claim that the hosted project was exploited.

**Correction:** server-enforced request/accept/decline/cancel/revoke transitions, actor validation, and explicit recipient consent. Test unrelated trainer/client, pending, accepted and revoked relationships through direct API calls.

### A02 — P0: Users control trusted account fields

The profile self-update policy at `supabase/schema.sql:27` protects the row, not specific columns. Later migrations add entitlement, usage and rating fields to it. `services/entitlements.ts:81` directly writes premium, trial and `admin_override` values from the client. The AI function trusts those fields. Role, AI count and aggregate ratings also lack repository protections against self-modification.

**Correction:** separate public/editable profile fields from server-owned roles, entitlements, usage and rating aggregates; use narrowly authorized server mutations. RLS alone does not restrict columns, as the [Supabase column-security documentation](https://supabase.com/docs/guides/database/postgres/column-level-security) explains. A hidden UI field is not an authorization control.

### A03 — P0 for enabled AI: Usage mutation is a privileged public RPC

`supabase/migrations/phase7c_hosted_repair.sql:172` declares `increment_ai_generation_count(user_id)` as `SECURITY DEFINER`, accepts an arbitrary user ID, and does not verify the caller. No execute revocations were found in repository SQL. Default function grants therefore matter; hosted grants remain unverified.

**Correction:** replace it with service-only reservation/finalization functions, explicit grants, bounded usage and server-derived identity. Direct anonymous/authenticated calls must not modify anybody's usage. Treat this together with A16, not as a standalone counter patch.

### A04 — P0: Authentication loading and refresh are unreliable

`app/(auth)/login.tsx:25` awaits sign-in, then sets global loading true. The installed Supabase implementation awaits its sign-in subscribers before returning; `hooks/useSession.ts:47` has already cleared loading. The screen then re-arms it with no guaranteed event to clear it. Biometric proceed repeats that pattern at `app/(auth)/biometric-setup.tsx:41`.

The auth callback at `hooks/useSession.ts:68` also awaits profile/store queries inside the callback. Installed SDK source explicitly warns about deadlocks when async callbacks await other Supabase operations (`node_modules/@supabase/auth-js/src/GoTrueClient.ts:3764`). Hydration error handling is inconsistent.

**Correction:** one auth lifecycle owner, synchronous auth event notification, hydration outside the callback, bounded loading/error/retry states, and no screen-level manual re-arming after successful authentication. Verify sign-in, signup with email confirmation both enabled/disabled, restore and token refresh.

### A05 — P0: Late requests and globally persisted state can cross accounts

`hooks/useSession.ts:31` checks component mounting rather than current auth identity. Hydration in workout/assignment/entitlement stores commits late responses unconditionally. Global persisted keys contain no owner namespace; active workouts lack owner IDs. Logout cleanup is present, but cannot invalidate requests already in flight.

Root and role layouts register routes without auth/role guards; the entry redirect in `app/index.tsx` does not cover every deep link. This is a navigation/cache exposure finding, not proof of a database-policy bypass.

**Correction:** user-scoped persistence, owner IDs, an auth-generation token for async commits, predictable logout and protected route groups. Delay user A's requests, sign out/sign in as B, then release them; none of A's state may appear or persist for B.

### A06 — P0: The repository cannot reconstruct its backend

`supabase/schema.sql:37` references `trainer_client_links` before creating it at `:48`. RPC definitions for `search_trainers`, `check_username_available`, `find_user_by_username` and `find_user_by_email` are absent. Creation of `reviews` and `invites` is absent, although services and repair SQL depend on them. `services/assignments.ts:67` inserts `exercises_json`, absent from the assignment table and all migrations.

The historical runbook omits self-assignment/entitlement migrations and offers a Git checkout as rollback, which cannot restore a changed database. No complete checked-in local Supabase setup or database test suite was found. SQL issues were source-inspected, not executed against a fresh database in this audit.

**Correction:** reconcile actual hosted state into complete ordered migrations; then prove clean setup and upgrade separately on disposable databases. Include RPCs, indexes, triggers, grants, policies, generated DB types and seed fixtures. Record deployed migration versions instead of relying on old phase labels.

### A07 — P0: Completed workouts and edits can silently disappear

`store/workoutStore.ts:324` clears the active session and shows local completion before a fire-and-forget insert; failure only logs at `:356`. Hydration at `:105` replaces local history with server history. The isolated store reproduction showed an unsynced workout count drop from 1 to 0. History edits also swallow remote failures at `:379`.

Assignment completion is a separate write in `app/(workout)/session.tsx:179`, so a completed assignment can exist without a saved workout.

**Correction:** durable user-scoped outbox, stable session/operation IDs, visible sync status, idempotent writes and an atomic backend completion operation linking workout to schedule occurrence. Unsynced data must survive refresh, logout policy, process death and reconnect; failed edits must remain pending or surface failure.

### A08 — P1: Recurring schedules have one lifetime completion status

Assignments contain weekdays and one status (`types/assignment.ts:16`; `supabase/schema.sql:129`). `services/schedule.ts:40` excludes completed assignments. Finishing Monday removes Wednesday/Friday and future weeks. Weekday overrides are local and have no date expiry. Date/week displays are memoized or initialized only once in member workout/schedule screens.

**Correction:** recurring prescription separate from dated occurrences, occurrence-specific completion/skip/missed/cancel/reschedule, timezone rules and explicit program start/end. Preserve historical snapshots and recalculate current dates on foreground/midnight.

### A09 — P1: Program scheduling puts all routines on the same days

`app/(client)/programs.tsx:139` loops through every routine using identical `selectedDays`. The resolver picks the newest matching assignment (`services/schedule.ts:43`). A Push/Pull/Legs program scheduled Mon/Wed/Fri can therefore show Legs on all three days.

**Correction:** map routine sequence to specific program days/weeks and preview the calendar before atomic save. Define how trainer versus self plans and overlapping programs interact instead of silently hiding one.

### A10 — P1: History loses reflection and provenance

Workout state records reflection, plan name and source (`store/workoutStore.ts:308`), but insert/update payloads omit them (`services/workouts.ts:49`, `:71`). The mapper reads `reflection_json` although SQL never adds that column; it never restores source/program. Completed workouts also lack an originating occurrence/assignment reference.

**Correction:** versioned history snapshot with exercise identity, prescribed/actual sets, source, program/routine revision, occurrence ID and reflection. Deleting or editing a future program must not rewrite past evidence.

### A11 — P1: Cross-device updates and notifications are not connected

`hooks/useRealtime.ts` has no callers. Assignment notifications are created in the assigning trainer's local store (`store/assignmentStore.ts:106`), while recipient hydration fetches only assignments. Several query hooks fetch only on mount/ID change; returning from create/link screens can leave stale lists. Errors are frequently swallowed and displayed as empty data.

**Correction:** mutation invalidation, focus/reconnect refresh, recipient notification records/read state and mounted subscriptions with reconnect reconciliation. Start with reliable refresh and persisted inbox; add push as a delivery channel. Do not treat a local banner as a notification system.

### A12 — P1: A member can request coaching, but trainers cannot resolve it

`services/marketplace.ts:188` writes pending links and client UI promises acceptance. Trainer code reduces relationship status to an active boolean (`services/trainer.ts:85`) and labels nonactive rows inactive. No acceptance/decline interface exists. Checked-in client link policies permit reads, not the request upsert.

**Correction:** explicit relationship state visible to both parties, incoming requests, recipient acceptance, decline/cancel, archive/revoke, and corresponding narrow database operations. Existing-account consent is required even if new-user invitations remain deferred.

### A13 — P1: Assignment/endorsement permissions are broader than their names

“Clients update own assignment status” permits every column update so long as `client_id` remains unchanged (`supabase/schema.sql:154`). Trainer assignment policy checks neither active relationship nor routine ownership. Program-owner updates allow self-written endorsement fields; the repair policy authorizing trainer endorsement is also not restricted to endorsement columns.

**Correction:** narrowly scoped server operations for assignment transitions and endorsement. Trainers must be able to inspect the complete prescription before endorsing it; approval must identify the reviewed revision and become stale when that revision changes.

### A14 — P1: Public versus private visibility is underspecified

Public trainer policies expose the matching profile row, including subsequently added account fields (`phase8_marketplace_profiles.sql:19`). All active linked clients can read all trainer programs (`supabase/schema.sql:85`; `services/programs.ts:87`). This may be intentional for a shared library, but cannot represent private individualized programming.

**Correction:** public profile projection with an explicit field list; program visibility/enrollment rules separating private templates, shared library and client-specific plans. Reviews need eligible-client checks and server-derived ratings before public launch.

### A15 — P1 for enabled AI: Generation validates JSON, not a training plan

Request data is only type-cast (`supabase/functions/generate-plan/index.ts:110`), output only parsed (`:178`), and review screens assume nested arrays exist. A model object without routines returned HTTP 200 in the local reproduction. No bounded request size, exercise/set/range checks, canonical exercise mapping, or upstream timeout exists. All weights are stored as kg, but the model prompt does not explicitly state a weight unit. Month mode asks for up to four times days/week routines under the same 4,000-token cap; completeness is not checked.

**Correction:** shared runtime schemas, explicit units, canonical exercise IDs, prescribed limits, bounded generation size/latency, validation before display/save, retry rules and evaluation fixtures. Include member constraints and trainer review; do not present generated loads as individually validated. Generate longer programs in a bounded structure or stages rather than trusting an unconstrained large response.

### A16 — P1 for enabled AI: Quota enforcement fails open and races

The function ignores profile-query errors and assumes count zero (`:113`); it checks usage before calling the model and increments afterward without checking the RPC result (`:187`). Five concurrent calls with one generation left all reached the model stub. Error handling in `services/generation.ts:223` normalizes the SDK error before examining the structured non-2xx body, risking loss of the useful cap/error code.

**Correction:** reserve quota atomically, fail closed on entitlement lookup failure, enforce per-user rate/concurrency/cost limits, and reconcile failures according to a documented charging rule. Parse and test structured errors, including CORS headers on all web responses. Add an operational kill switch that the client/function actually consume.

### A17 — P1: Plan creation is nontransactional and review lacks editing

`services/programs.ts:344` creates the parent before inserting routines at `:382`; a failure leaves an orphan and retry can duplicate it. Custom-routine container creation similarly uses read-then-create without uniqueness. Review UI offers Save/Regenerate but no edit; actions can overlap (`app/(client)/review-plan.tsx:205`). Client program cards lack detail navigation (`app/(client)/programs.tsx:261`), and the routine editor restricts edits to My Routines.

**Correction:** atomic idempotent plan creation, typed unique routine containers, review/edit/accept, mutually exclusive async actions, and complete saved-program detail/edit/copy/archive flows with ownership rules.

### A18 — P1: Exposed authentication methods and recovery are incomplete

Forgot password is plain text (`login.tsx:50`); social buttons navigate to an OTP placeholder; OTP Verify only navigates and Resend is inert. Biometrics invoke a real device prompt but ignore its result, save no preference and do not protect later access (`biometric-setup.tsx:45`). Registration assumes a immediately usable session and needs a confirmed-email path.

**Correction:** finish email verification/reset/deep-link handling first. Either implement each optional sign-in/unlock method completely or remove its exposed controls from the beta. Assess native secure session storage; the active Supabase client uses AsyncStorage, not the existing SecureStore wrapper.

### A19 — P1: Account, privacy and support flows stop at labels

Settings navigation rows have no `onPress` (`app/(shared)/settings.tsx:104`). Notification/dark-mode switches modify component-local state only; units are real. Member profile is read-only. No account deletion/export service, usable help/terms/privacy destination or avatar upload flow was found.

**Correction:** working account editing/recovery, real preferences, support/privacy/terms, export and deletion with a defined data-retention outcome. Apple requires an in-app deletion initiation path for account-creating apps; Google Play requires in-app and external request paths. See [Apple account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/) and [Google Play deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN). This is a concrete distribution prerequisite, not a substitute for jurisdiction-specific legal review.

### A20 — P1: Workout entry can change intended values or discard work

Controlled weight input parses and reformats every keystroke (`components/workout/SetRow.tsx:28`; `services/units.ts:24`), producing the reproduced `22.5 → 225` sequence. Reps accept invalid/nonfinite values. Prescribed duration/rest is discarded when building logs (`workoutStore.ts:45`); workout rest uses a hardcoded 90 seconds. Active rest timer state is excluded from persistence.

The session close action cancels immediately without confirmation (`app/(workout)/session.tsx:195`), while restart does confirm. Finish can mark zero-set work complete.

**Correction:** string input buffers with validation on commit, locale/unit tests, per-exercise measurement/prescription support, recoverable timer state, safe cancellation and an explicit empty/partial completion rule.

### A21 — P2: Progress statistics are neither complete nor scalable

History is capped at 50 in server fetch/local state and ten in visible history, yet UI calls totals “all time” (`services/workouts.ts:37`; `statistics.tsx:92`). Trainer metrics fetch individual workouts for all linked clients and count locally (`services/trainer.ts:49`), making counts vulnerable to backend row limits as usage grows. Adherence has no reliable occurrence denominator and is not implemented as a useful trainer metric.

**Correction:** paginated complete history, server aggregates, agreed PR/adherence definitions, exercise trends and query indexes. Verify with more than 50 member workouts and more than 1,000 roster workouts; measure before further optimization.

### A22 — P2 product gap: Trainers cannot complete routine coaching work

Trainer authoring is substantial but lacks existing-routine editing, drafts, duplication/reordering and program progression/versioning. Member details show counts/status rather than completed sets, reflections or planned-versus-actual evidence. No intake/check-in/member-reply/trainer-feedback flow exists. Endorsement displays only a name/description before approval. The dashboard provides counts rather than a review work queue.

**Correction:** complete author → prescribe → review → respond → adjust. A minimal asynchronous check-in/feedback loop is enough for beta; a general chat/video/business platform can follow validated demand.

### A23 — P1 before payments: Billing architecture is not a trusted revenue system

The real/mock adapter, purchase/restore and management entry points exist. Entitlements are written by the app; no webhook/reconciliation implementation was found. Trial starts automatically on first member hydration (`store/entitlementStore.ts:27`), differing from the historical “three free generations then trial” description. Routine limits are checked in UI, not enforced by a trusted backend.

The annual fallback price `$7.99` is rendered `/year` (`subscription.tsx:25`, `:171`, `:249`), although its relationship to `$9.99` monthly and the 20% label suggests an intended monthly equivalent. The annual toggle does not filter live offerings. Provider/debug terminology is visible in normal purchase UI. Environment labels do not themselves establish correct store products.

**Correction:** settle the free/trial rule; server-owned entitlements, purchase lifecycle reconciliation, sandbox tests and accurate localized prices/renewal terms. [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks) support backend subscription updates and require authentication and duplicate-event handling. App Premium is a different product from a trainer's coaching fee or payout.

### A24 — P2, core-flow beta gate: Accessibility needs implementation and testing

No explicit `accessibility*` props were found in app/components. Icon-only actions lack meaningful labels/state, some touch targets are very small, inputs lack explicit label association, and auth forms are non-scrollable without keyboard avoidance. This does not mean every native control is inaccessible; it means the app has no demonstrated accessible critical journey.

**Correction:** labels/roles/states, focus order, reachable actions, adequate touch areas, keyboard-safe forms and large-text layouts; validate login, workout logging, finish/cancel, and trainer assignment with VoiceOver/TalkBack on devices.

### A25 — P1: Build configuration and documentation are inconsistent

Compatibility check reported installed → expected: Expo `54.0.33 → ~54.0.37`, constants `18.0.13 → ~18.0.14`, dev client `6.0.20 → ~6.0.21`, font `14.0.11 → ~14.0.12`, linking `8.0.11 → ~8.0.12`, local authentication `17.0.8 → ~17.0.9`, router `6.0.23 → ~6.0.24`, worklets `0.8.1 → 0.5.1`. These are the audit-time installed-SDK compatibility expectations, not a recommendation to blindly downgrade/upgrade individual packages.

`.env.example` omits the required Supabase variables while containing unrelated API/social flags. `config/constants.ts` feature flags have no consumers; disabling subscriptions there does not actually disable the purchase flow. README describes a mock-only Phase 1 app and uses npm despite the Yarn instruction. Handoff overstates realtime, editing, search, migrations and deployment readiness. The two routine builder screens total 2,715 lines and duplicate substantial logic.

**Correction:** align dependencies as a tested SDK set, triage advisory exposure, document actual environment/build setup, implement real release gates, and rewrite status documentation from verified acceptance tests. Extract shared builder/domain logic after behavior has tests. Follow [Expo's incremental upgrade guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), rather than combining an unbounded framework migration with product completion.

### A26 — P1: Quality and operation have no release gate

No application test runner, lint configuration, executable CI workflow, database/RLS suite, crash reporting or product-event instrumentation was found. EAS build profiles exist but native readiness and store configuration remain unverified; Android package identifier is absent from checked-in app config. Most errors log locally or become empty state. No repository-backed backup/restore or incident procedure proves recovery.

**Correction:** targeted unit/integration/RLS/device tests around the failures above, CI typecheck/lint/tests/export, structured errors and crash/sync/AI-cost monitoring, staged migrations and internal builds, tested rollback/restore and operator support tools. Supabase recommends testing allowed and denied operations for exposed tables; see [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

### A27 — P2: Smaller defects compound misleading feedback

- Trainer `createProgram` omits source (`services/programs.ts:123`), while migration defaults to client; linked-member routines can be labeled self-created. Infer/validate origin server-side and backfill existing trainer-owned rows.
- Assignment submission has no busy/idempotency guard (`app/(trainer)/assign.tsx:43`, `:168`); repeated taps can duplicate rows.
- Clearing trainer bio/video converts empty input to `undefined` (`edit-profile.tsx:47`, `:50`), so existing values survive. Send explicit clearing values.
- Failed loads are often rendered as empty lists; add retry/stale/error states throughout both roles.
- Program/routine destructive actions need an explicit future-only versus history-preserving policy and atomic lifecycle behavior; existing cleanup is useful but not a substitute for snapshots/versioning.

## What to preserve and what to change first

Preserve Expo managed workflow, TypeScript, expo-router, Supabase, Zustand for local state, the theme/components, kg as canonical storage, the billing adapter boundary, and the investment in grouped strength routines. A cloud rewrite is not supported by this audit; the failures are primarily lifecycle, authorization and product-model issues.

Change the domain model and trust boundaries before building advanced analytics, messaging, marketplace growth or billing. Implement a narrow, consent-based existing-client beta first. The companion roadmap covers all discovered missing areas while distinguishing core completion from optional expansion.

The audit is a source-grounded completion assessment with selected local reproductions. The remaining proof is a reproducible backend and a real two-role device test cycle—not another feature-complete checklist.
