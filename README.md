# Help Desk

An AI-powered ticket management system. Support emails come in as tickets;
AI classifies them, drafts replies from a knowledge base, and agents review
and respond — freeing agents from manual triage on routine requests.

See [`project-scope.md`](./project-scope.md) for the full problem/solution
writeup and open questions, [`techstack.md`](./techstack.md) for the chosen
stack and why, and [`implementation-plan.md`](./implementation-plan.md) for
the phased task breakdown.

**Current status:** authentication (login, session-based auth, sign-out) is
implemented. Ticket CRUD, AI features, and email integration are not built
yet — see `implementation-plan.md` for what's next.

## Tech stack

- **Frontend:** React + TypeScript (Vite), React Router, Tailwind CSS,
  React Hook Form + Zod
- **Backend:** Express + TypeScript, run directly by Bun
- **Database:** PostgreSQL, accessed via Prisma
- **Auth:** [Better Auth](https://www.better-auth.com/), database-backed
  sessions (HTTP-only cookie + server-side session table)

## Project structure

```
client/   React app (Vite)
server/   Express API + Prisma schema/migrations
```

- `client/src/pages/` — routed pages (`Login`, `Home`)
- `client/src/components/` — shared UI (`NavBar`, `ProtectedRoute`)
- `client/src/lib/auth-client.ts` — Better Auth client
- `server/src/auth.ts` — Better Auth server config
- `server/src/index.ts` — Express app and routes
- `server/prisma/schema.prisma` — data model (`User`, `Ticket`, plus Better
  Auth's `Session`/`Account`/`Verification`)

## Prerequisites

- [Bun](https://bun.sh)
- PostgreSQL 17, with a database and a dedicated app role (not the
  `postgres` superuser) that has `CREATEDB` granted, so Prisma Migrate can
  manage its shadow database

## Setup

1. Install dependencies from the repo root:
   ```
   bun install --no-save
   ```
   (`--no-save`: see [Known issues](#known-issues) below — this is a
   permanent workaround on this machine, not a one-off.)

2. Create `server/.env` (see `server/.env.example` for the required keys):
   - `DATABASE_URL` — Postgres connection string for the `helpdesk_app` role
   - `BETTER_AUTH_SECRET` — random 32+ char string (`openssl rand -base64 32`)
   - `BETTER_AUTH_URL` — `http://localhost:4000`
   - `TRUSTED_ORIGINS` — `http://localhost:5173` (the client's dev origin)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the seeded admin user

3. Run migrations and generate the Prisma client, from `server/`:
   ```
   bunx prisma migrate dev
   bunx prisma generate
   ```

4. Seed the admin user, from `server/`:
   ```
   bun run seed
   ```

## Running the app

Two terminals:

```
cd server && bun run dev   # http://localhost:4000
```
```
cd client && bun run dev   # http://localhost:5173 (or next free port)
```

The client's Vite dev server proxies `/api/*` requests to the Express
server, so the frontend never needs to know the backend's port directly.

## Known issues

**No lockfile.** `bun install` on this machine fails writing
`bun.lock`/`bun.lockb` due to a confirmed incompatibility between this
Windows build and the active antivirus's filesystem filter driver — not a
project config issue. Always install with `bun install --no-save`;
dependency versions are still pinned exactly in each `package.json`. Do not
work around this with antivirus exclusions.
