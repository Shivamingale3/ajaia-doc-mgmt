# AI Workflow Note

## Tools used

Claude Code (Anthropic), used interactively across the whole project — schema
design, backend and frontend implementation, test writing, the Docker
deployment setup, and these docs.

## Where AI materially sped things up

- **Repeating an established pattern correctly.** Once the auth slice
  established a layered shape (validation schema → interface → service →
  controller → routes, see `backend/src/services/auth.service.ts` and its
  neighbors), extending the same shape to documents/sharing/upload was fast
  and consistent — same error-handling conventions, same `ApiResponse`
  envelope, same access-control-in-one-place pattern, without manually
  re-deriving the style file by file.
- **Test breadth.** The 45-test backend suite (auth flow, document CRUD,
  access control, sharing idempotency, upload) would have taken meaningfully
  longer to write by hand at the same coverage; generating it against an
  already-verified-by-curl backend meant the tests encoded behavior that had
  already been confirmed correct, not guessed at.
- **Cross-cutting plumbing.** Wiring TanStack Router's `beforeLoad` context
  pattern, a fetch-with-refresh-retry API client, and the Docker multi-stage
  build (frontend build → backend build → combined runtime image) are the
  kind of "correct in one pass if you know the pattern, easy to get subtly
  wrong if you don't" tasks where AI assistance shows up as fewer
  trial-and-error cycles, not zero effort.

## What AI-generated output was changed or rejected

- **shadcn's own CLI wrote files to the wrong path.** After configuring the
  `@/*` import alias, `npx shadcn add button` reported success but had
  actually created a literal directory named `@` at the project root instead
  of resolving into `src/` — it was reading the alias from the root
  `tsconfig.json`, which had no `compilerOptions` (this project splits
  config via TS project references). Caught via `git status` showing an
  unexpected `@/` directory; fixed by moving the files into `src/` and adding
  the path mapping to the root `tsconfig.json` too, not just
  `tsconfig.app.json`.
- **A pre-existing password validation bug.** The original login schema's
  regex (`[a-zA-Z\d]{8,16}`) silently rejected any password containing a
  special character and capped length at 16. This wasn't AI-authored in this
  session, but it was existing code an AI-assisted pass could easily have
  reused as-is without reading it closely; it was surfaced and fixed instead
  of carried forward.
- **`prisma.config.ts`'s env path was wrong.** It resolved `.env` one
  directory *above* `backend/`, a path that doesn't exist — meaning
  `prisma db push`/`migrate` could never actually find `DATABASE_URL`. Caught
  when a routine `prisma db push` failed with a confusing "datasource.url is
  required" error rather than the expected connection, traced back to the
  path resolution rather than accepted as "must be a config problem
  upstream."
- **A leaked credential in a committed example file.** `backend/env.example`
  contained what reads as a genuine Postgres password (not a placeholder),
  committed to git since the initial scaffold. Rather than reusing that value
  for anything or leaving it as-is while writing deployment docs, it was
  replaced with an actual placeholder and flagged to the user directly, with
  a recommendation to rotate the real credential — fixing the file doesn't
  remove it from git history.
- **A dangerous command was refused, correctly.** `prisma migrate reset`
  (needed once, to move the database from ad-hoc `db push` state to real
  migration history) was blocked by Prisma's own built-in AI-agent guard.
  That guard was respected rather than routed around: the exact command,
  target database, and consequences were stated plainly, and the user's
  explicit "yes" was required before proceeding — not treated as a hurdle to
  clear quietly.

## How correctness was verified

- **Real requests before automated tests.** Every backend feature was
  exercised with actual `curl` requests against a real Postgres database
  (access control, idempotent share/revoke, sanitization of a `<script>` tag
  in saved content, upload of real `.txt`/`.md` fixtures and rejection of a
  disallowed extension) before being written up as an automated test —
  meaning the tests encode already-confirmed behavior, not assumptions.
- **Tests run against a real database, not mocks.** The Vitest suite
  connects to the same Postgres as local development (`backend/tests/`);
  each test scopes its own data under a random-per-run email domain and
  cleans up in `afterAll`, so the suite is trustworthy evidence about the
  real query/constraint behavior (e.g. the `DocumentShare` unique
  constraint), not a mocked approximation of it.
- **Real browser verification, including a hard reload.** The full flow —
  register, login, create a document, apply every toolbar formatting option,
  save, **hard-reload the page**, and confirm the exact formatted HTML
  survived — was run in an actual browser against the actual backend. Sharing
  was verified from both sides: a second real account confirmed the document
  appeared under "Shared with me" with the correct owner-hidden UI, and that
  revoking access actually removed it.
- **The production Docker image was built and run, not assumed to work.**
  Before writing deployment instructions, the combined image was built and
  run against a throwaway Postgres container: confirmed `prisma migrate
  deploy` applies cleanly, the seed script is idempotent (run twice,
  checked row counts didn't duplicate), the frontend is served correctly,
  the SPA fallback serves `index.html` for a client-side route on refresh
  without swallowing real API 404s, and a seeded account can log in — all
  before asking the user to run any of it on their own hardware.
