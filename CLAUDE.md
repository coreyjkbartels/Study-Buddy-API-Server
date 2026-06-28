# CLAUDE.md — Study Buddy API Server (backend)

Context for AI assistants and humans working in this repo. Keep it lean.

## What this is

The **REST API** for Study Buddy — a site where students in the same course find
each other, plan study sessions, and track shared coursework. The frontend SPA
lives in a sibling repo: `Study-Buddy`.

## Product docs (canonical, in the frontend repo)

The product-level docs cover **both** repos and live in `Study-Buddy/docs/`:

- `Study-Buddy/docs/MVP.md` — scope + "done" criteria.
- `Study-Buddy/docs/ROADMAP.md` — feature list + live status (incl. backend bugs).
- `Study-Buddy/docs/ARCHITECTURE.md` — decisions, trade-offs, **code critiques**,
  open questions. Read §3 (critiques) before changing routes/models.

(If the repos aren't checked out side by side, ask where `Study-Buddy` lives.)

## Stack

- Node + Express 5
- MongoDB via Mongoose (`src/db/mongoose.js`)
- Auth: JWT (`jsonwebtoken`) + `bcrypt`; stateful tokens stored on the user
- Swagger docs: `swagger-jsdoc` + `swagger-ui-express` at `/api-docs`
- Present but verify usage: `@sendgrid/mail` (email), `multer` + `sharp` (uploads)
- Plain JavaScript, ES modules (no TypeScript yet — see ARCHITECTURE D2)

## Run

```sh
npm install
npm run dev   # env-cmd + nodemon (needs a .env: PORT, MONGODB URI, JSON_WEB_TOKEN_SECRET, ...)
npm start     # node src/app.js
npm run api   # serve the swagger editor
```

Requires a `.env` (loaded via `env-cmd`). At minimum: `PORT`,
`JSON_WEB_TOKEN_SECRET`, the Mongo connection string, and any SendGrid key if
email is used. Never commit `.env`.

## Layout

- `src/app.js` — Express setup, mounts routers, Swagger.
- `src/models/` — Mongoose schemas (user, course, courseMembership, assignment,
  assignmentUserState, session, sessionParticipant, sessionMessage, availability).
- `src/routers/` — user, course, assignments, session, availability.
- `src/middleware/` — `auth`, `courseAccess`, `sessionAccess`, `assignmentAccess`.
- `src/assets/` — `error.js`, `timezoneValidation.js`.

## Conventions (target state — see ARCHITECTURE §5)

- Routes are REST, nested under `/courses/:courseId/...`.
- **Declare specific paths before param paths** (e.g. `/members/me` before
  `/members/:userId`) — an ordering bug currently breaks "leave course".
- Errors should use one envelope `{ error: { code, message } }` via a central
  error-handling middleware — not the current mix of strings/JSON/emoji.
- Document new routes with `@openapi` JSDoc (only the course router is documented
  so far).

## Known bugs to be aware of (details in ARCHITECTURE §3)

- `GET /courses/:courseId/sessions` doesn't filter by course (returns all).
- `DELETE /courses/:courseId/members/me` is shadowed by `/members/:userId`.
- `GET /courses` leaks `joinCode`.
- Messages date filter sets `startsAt` on a model that has `sentAt`.
- RSVP checks `'waitlist'` but the enum is `'waitlisted'`.

## When you finish something

Update status in `Study-Buddy/docs/ROADMAP.md`; add design issues to
`ARCHITECTURE.md`.
