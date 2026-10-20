# Local web API

This API supports the web-first preview without a Supabase project, hosted model, email provider, payment processor, or native runtime. It uses Node's built-in modules only. It is intended for a single machine and binds to `127.0.0.1`; do not expose or tunnel it publicly.

```sh
node server/index.mjs
node --test server/tests/*.test.mjs
```

The default address is `http://127.0.0.1:8094`. The same process serves the exported `web-dist/` app. During Expo development, the browser on port 8093 can use this API on port 8094. `/api/health` is a public readiness endpoint.

Configuration:

| Environment variable | Default                | Purpose                           |
| -------------------- | ---------------------- | --------------------------------- |
| `AI_GYM_PORT`        | `8094`                 | Loopback listening port           |
| `AI_GYM_DATA_DIR`    | `<project>/.local-web` | Private JSON data directory       |
| `AI_GYM_TIMEZONE`    | `America/Toronto`      | Seed and server calendar boundary |

On first use, the API creates demonstration data. All four seeded accounts use `TrainToday!2026`:

| Email                  | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `member@aigym.local`   | Alex Morgan, connected member with sample training history |
| `trainer@aigym.local`  | Jordan Lee, connected coach                                |
| `member2@aigym.local`  | Independent member for consent and isolation checks        |
| `trainer2@aigym.local` | Independent coach for consent and isolation checks         |

Registration creates empty accounts; it does not copy seeded activity. Demo profiles, reviews, messages and training activity are marked as demonstration content.

## Data guarantees

- Schema-versioned JSON snapshots use a temporary file, file sync, atomic rename, and directory sync. Mutations run serially against a private copy, and failed writes do not replace in-memory state.
- A process lock prevents two API processes from writing one data directory. A lock left by an exited process is recovered automatically. Unsupported schema versions and corrupt JSON fail closed without overwriting the existing file.
- Passwords use salted scrypt. Only hashes of random bearer session tokens are stored. Sessions expire after seven days; password changes invalidate other sessions. Exported account data contains no password hashes or tokens.
- Coaching relationships require recipient acceptance. Pending links expose names and intended public profiles, but no private goals, programs, workouts or contact information. Revocation immediately stops private trainer access.
- Member programs marked private remain private. Shared member plans become available to accepted coaches; shared coach templates become available to accepted members. Assignments expose immutable snapshots of their prescribed program to the recipient even after the original is edited or deleted.
- Assignments create dated occurrences, each with independent state. Assignment retries use the provided operation ID. A routine may not be scheduled twice on the same date, while intentional different routines on a date are supported.
- Stable workout IDs make completion retries idempotent. The workout, occurrence status, and coach notifications commit together. Editing or deleting templates never rewrites workout snapshots. Cancellation preserves completed sessions, sessions already in progress, and past skipped/missed sessions.
- Saved workouts contain bounded numeric values in kg, complete exercise snapshots, reflections and optional coach feedback. An assigning coach owns feedback on their assigned workout; another coach cannot overwrite it. Editing a reviewed log clears its stale feedback.
- Local generation returns an unsaved, editable template draft and explicitly reports `provider: 'local-template'`. It never invokes a remote AI provider. Saving is a separate action. Source attribution and endorsement fields are controlled by the server; endorsements apply to a specific shared program revision and clear after editing.
- Account deletion removes the account, sessions, personal journal, programs, relationships, messages, authored notification snippets and reviews. Deleting a coach retains anonymized prescribed snapshots and completed workout records belonging to members; it cancels future prescribed sessions.

## Test isolation and restore

The Node tests create disposable directories under the operating system temporary directory, use ephemeral loopback ports, and remove their fixtures. They never use the default `.local-web` directory. Browser tests use their own disposable data directory.

For a local backup, stop the server, copy the data directory to a private location, then restart. Restore with the server stopped. Treat a backup as sensitive: it contains profile details, workout journals, messages, and password hashes. Account export is a user-facing export rather than a complete database backup.

`createApiServer({dataDir, seed, staticDir})` returns a Node HTTP server without listening. `startServer({port, dataDir, seed, staticDir})` starts it on loopback. Tests and embedding callers should use `await server.shutdown()` to finish requests and release the data lock. The CLI handles SIGINT and SIGTERM.

## Hosting boundary

This is a local preview implementation, not the deployed database or a production identity service. Password recovery, verified email, hosted AI, billing, push delivery, and native lifecycle testing remain explicitly unavailable. Browser capabilities report those services as disabled. Before any hosting, replace this single-process local persistence/auth adapter with a hosted implementation, preserve and test the domain authorization guarantees, add operational backups and monitoring, and validate real-device behavior separately.
