# Submission Checklist

## Included in this folder/repo

- [x] Source code (`backend/`, `frontend/`, root `Dockerfile` + `docker-compose.yml`)
- [x] [README.md](README.md) — local setup and run instructions
- [x] [ARCHITECTURE.md](ARCHITECTURE.md) — architecture note
- [x] [AI_WORKFLOW.md](AI_WORKFLOW.md) — AI workflow note
- [x] This file
- [ ] **Live product URL** — pending deployment to the Pi (Dockerfile/compose
      are built and verified locally; the actual `docker compose up` on the
      Pi, plus wiring the Cloudflare Tunnel ingress + DNS, is a step only
      doable on that hardware)
- [ ] **Walkthrough video URL** (text file) — not recorded
- [ ] Screenshots / demo GIF — not included; the README's setup steps don't
      need extra visual aids beyond the written instructions, so this was
      treated as optional per the assignment brief ("if setup requires extra
      steps")

## Seeded accounts for reviewing the sharing flow

Run `npm run seed` (from `backend/`, or automatically on container start —
see the Dockerfile) to create:

| Email | Password | Role |
|---|---|---|
| `alice@demo.local` | `DemoPass1!` | Owns "Welcome to the demo" |
| `bob@demo.local` | `DemoPass1!` | Has that document shared with them |

## What's working

- Register / login / logout / session refresh
- Create, rename, edit, delete a document; content and formatting persist
  across refresh (verified with a real hard-reload test, not assumed)
- Rich text: bold, italic, underline, headings (H1–H3), bulleted and
  numbered lists
- Autosave (debounced) + manual save + save-status indicator
- File upload: `.txt` and `.md` → new document, with clear rejection of any
  other type
- Sharing: grant access by email, revoke access, owned-vs-shared distinction
  in the documents list, correct 403/404 access-control boundaries
- 45 automated backend tests (Vitest + Supertest, run against a real
  Postgres database)
- Production Docker image: built and run end-to-end against a throwaway
  Postgres (migration, seed, static frontend serving, SPA fallback, API all
  confirmed working) before writing deployment instructions

## What's incomplete

- Not yet deployed to a reachable URL (see the unchecked item above)
- No frontend automated test suite
- No `.docx` upload support (`.txt`/`.md` only)

## What I'd build next with another 2–4 hours

See ARCHITECTURE.md's ["What I'd build next"](ARCHITECTURE.md#what-id-build-next-with-24-more-hours)
section — in short: view/edit permission tiers for sharing, `.docx` upload,
frontend code-splitting for the editor bundle, a frontend test suite, and
document version history.
