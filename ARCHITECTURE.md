# Architecture Note

## Priorities, in order

1. **Correct access control.** A shared document management app is only as
   good as its sharing model being actually safe — an owner-only action that
   a shared user can trigger, or a document visible to someone with no
   relationship to it, is a worse failure than a missing toolbar button. Every
   document route resolves the caller's role (`owner` / `shared` / no access)
   in one place ([`document.service.ts`](backend/src/services/document.service.ts)'s
   `resolveAccess`/`assertOwner`) rather than re-deriving it per-route, and a
   caller with no relationship to a document gets the same 404 as a
   nonexistent one — its existence isn't revealed to outsiders.
2. **An editing experience that actually feels coherent.** Tiptap
   (ProseMirror) rather than a bare `contentEditable` div: real undo/redo,
   correct list/heading semantics, and a toolbar that reflects actual cursor
   state (`editor.isActive('bold')`) instead of guessing.
3. **Everything verified against the real stack, not just typechecked.**
   Every backend feature in this project was exercised with real HTTP
   requests against a real Postgres database before being considered done —
   first by hand (curl), then as an automated test. The frontend was checked
   in a real browser against the real backend, including a full
   create → format → save → **hard reload** → confirm-it-persisted cycle, and
   a second real account confirming the shared side of sharing.

## Data model

```
User ──< Document (ownerId)
User ──< DocumentShare >── Document
```

- `Document.content` is stored as a sanitized HTML string (not Tiptap's JSON
  format). One format flows through create, autosave, and file upload, which
  is simpler than maintaining two. Tiptap's editor initializes directly from
  it (`content: document.content`) and saves back via `editor.getHTML()`.
- `DocumentShare` has a unique constraint on `[documentId, userId]` — sharing
  with someone who already has access is a no-op success (upsert), not an
  error, and revoking access that's already gone is likewise a no-op.
- Sharing is **single-tier**: any share grants full edit access. See
  [Scope cuts](#scope-cuts).

## Request flow: sharing

1. Owner calls `POST /documents/:id/shares { email }`.
2. `assertOwner` confirms the caller owns the document (403 if they're a
   shared, non-owner user; 404 if they have no relationship to it at all).
3. The target user is resolved by email; sharing with an unknown email is a
   404, sharing with yourself is a 400.
4. `DocumentShare` is upserted.
5. The shared user's next `GET /documents` includes the document tagged
   `role: 'shared'`, with the owner's name — this is what the frontend uses
   to render it under "Shared with me" instead of "My documents", and to hide
   the Share/Delete buttons on the editor page for a non-owner.

## Security: sanitizing content

Two content sources reach the database: an editor save (`PATCH
/documents/:id`) and a file upload converted to HTML
([`fileToHtml.ts`](backend/src/utils/fileToHtml.ts)). Both pass through
[`sanitizeContent.ts`](backend/src/utils/sanitizeContent.ts) before being
persisted — an allowlist matching exactly the tags the six enabled Tiptap
extensions can produce (`p`, `h1`–`h3`, `strong`, `em`, `u`, `ul`, `ol`, `li`,
`br`). This is defense-in-depth: Tiptap's own ProseMirror parser is already
schema-constrained (it drops tags/attributes it doesn't recognize when
initializing the editor), but stored content should be safe on its own terms
— not only when it happens to pass back through Tiptap — since a `.md`
upload's `<script>` tag (via `marked`'s raw-HTML passthrough) or a crafted
API request are both untrusted input paths that never touch the editor.

## Auth

JWT access (15 min) + refresh (7 days) tokens in httpOnly cookies, built
before this feature set (see [AI_WORKFLOW.md](AI_WORKFLOW.md) for how that
scope grew). The refresh token cookie is scoped to `path=/api/auth` so it
isn't sent on every request; the frontend's API client
([`api-client.ts`](frontend/src/lib/api-client.ts)) transparently retries
once after a refresh on a 401, so a session doesn't visibly interrupt the
user every 15 minutes.

## Scope cuts

Made deliberately, to keep depth in access control and the editing experience
rather than spreading thin:

- **No view/edit permission tiers.** goal.md itself lists "role-based sharing
  permissions beyond basic access" as optional stretch work — single-tier
  sharing (full edit) satisfies the stated minimum ("a way to grant another
  user access") without a second permission dimension threading through the
  schema, API, and editor's read-only mode.
- **No real-time collaborative editing.** Autosave is debounced,
  last-write-wins `PATCH` — no operational transform / CRDT merge. Also
  listed as optional stretch work in goal.md.
- **Upload supports only `.txt` and `.md`.** Both convert cleanly to the same
  HTML format documents already use; `.docx` needs a real parser (e.g.
  mammoth.js) for comparable fidelity, which wasn't worth the added
  dependency and edge cases for this scope.
- **No frontend automated test suite.** The backend's 45 tests (Vitest +
  Supertest, against a real database) already clear goal.md's "at least one
  meaningful automated test" bar several times over, and directly exercise
  the access-control logic that mattered most to get right. Standing up
  frontend test infrastructure (jsdom/RTL/MSW) was judged better spent as
  actual browser verification time instead, given the timebox.
- **~840KB frontend bundle**, mostly Tiptap + ProseMirror + React Query in
  one chunk. Code-splitting (dynamic `import()` for the editor route) would
  fix this; not done here since it's a performance nit, not a correctness
  one, and the timebox went to finishing the feature set instead.

## What I'd build next with 2–4 more hours

- View/edit permission tiers for sharing
- `.docx` upload support
- Code-split the editor bundle
- A frontend test suite for the critical flows (login, create → edit → save,
  share → revoke)
- Document version history (explicitly optional stretch in goal.md, and the
  next thing I'd reach for if extending this further)
