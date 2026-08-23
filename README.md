# Ajaia Document Management

A lightweight, Google-Docs-style collaborative document editor: create and format
documents in the browser, import a `.txt`/`.md` file as a new document, and
share a document with another user.

**Live demo:** _add the deployed URL here once it's live_
**Demo accounts:** see [Seeded demo accounts](#seeded-demo-accounts) below.

See also: [ARCHITECTURE.md](ARCHITECTURE.md) for what was prioritized and why,
[AI_WORKFLOW.md](AI_WORKFLOW.md) for how AI tools were used on this project,
and [SUBMISSION.md](SUBMISSION.md) for the assignment deliverables checklist.

## Stack

- **Backend:** Node.js, Express 5, TypeScript, Prisma + PostgreSQL, Zod validation
- **Auth:** JWT access + refresh tokens in httpOnly cookies (register/login/refresh/logout)
- **Frontend:** React 19, TanStack Router + Query, Tiptap (rich-text editor), Tailwind CSS v4, shadcn/ui
- **Tests:** Vitest + Supertest, run against a real Postgres database (not mocked)

## Features

- Create, rename, edit, and delete documents; content and formatting persist
  across refresh
- Rich-text formatting: bold, italic, underline, headings (H1–H3), bulleted
  and numbered lists
- Autosave (debounced) plus a manual **Save** button and a save-status indicator
- File upload: **.txt and .md only** — the file's content becomes a new
  document. Any other file type is rejected with a clear error, both in the
  UI and from the API (2MB size limit)
- Sharing: a document owner can grant another registered user access by
  email. Sharing is single-tier — anyone you share with can view and edit.
  The documents list visibly separates **My documents** from **Shared with me**
- Access control: a user with no relationship to a document gets a 404 (its
  existence isn't revealed); a shared (non-owner) user gets a 403 on
  owner-only actions like delete or managing shares

## Local setup

Prerequisites: Node.js 24, a PostgreSQL database, npm.

### 1. Backend

```bash
cd backend
npm install
cp env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate each with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- Everything else has a sensible default for local dev (see the comments in `env.example`)

Apply the schema and start the API:

```bash
npm run prisma:migrate:dev   # creates/updates the database schema
npm run seed                 # optional — creates the demo accounts below
npm run dev                  # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

The frontend's dev server proxies `/api` to `http://localhost:5000`, so both
must be running. Open `http://localhost:5173`.

### 3. Run the tests

```bash
cd backend
npm test
```

Tests run against the same database as `DATABASE_URL` (see `backend/tests/`)
— they create and clean up their own uniquely-scoped rows, so this is safe to
run against a database you're also using for local dev.

## Seeded demo accounts

Run `npm run seed` (from `backend/`) to create two accounts with a document
already shared between them, so the sharing flow is visible immediately:

| Email | Password | Role |
|---|---|---|
| `alice@demo.local` | `DemoPass1!` | Owns "Welcome to the demo" |
| `bob@demo.local` | `DemoPass1!` | Has that document shared with them |

## Deployment

This repo builds as a single combined Docker image — one Express process
serves the API and the built frontend from the same origin. See the root
[`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml).

```bash
docker build -t ajaia-doc-mgmt .
```

Copy [`env.production.example`](env.production.example) to `.env.production`
and fill in real values (a fresh `DATABASE_URL` pointing at your Postgres, and
freshly generated JWT secrets — don't reuse the local `.env` ones), then:

```bash
docker compose up -d
```

The container runs `prisma migrate deploy` and the seed script automatically
on startup, then starts the server on the port set by `APP_PORT` (default
5000). Point your reverse proxy / tunnel at that port.

## Known limitations

- Sharing is single-tier (full edit for anyone shared with) — no view-only
  permission level. Deliberate scope cut; see ARCHITECTURE.md.
- No real-time collaborative editing — autosave is last-write-wins.
- Upload only supports `.txt` and `.md`.
- No frontend automated test suite (backend has 45 tests covering auth,
  documents, sharing, and upload).
