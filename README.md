# Help Desk

An AI-powered ticket management system. Support emails come in as tickets;
AI classifies them, drafts replies from a knowledge base, and agents review
and respond — freeing agents from manual triage on routine requests.

See [`project-scope.md`](./project-scope.md) for the full problem/solution
writeup and open questions, [`techstack.md`](./techstack.md) for the chosen
stack and why, and [`implementation-plan.md`](./implementation-plan.md) for
the phased task breakdown.

**Current status:** authentication (login, session-based auth, sign-out) and
an admin-only user list, including creating new users from a modal, are
implemented. Ticket CRUD, AI features, and email integration are not built
yet — see `implementation-plan.md` for what's next.

## Tech stack

- **Frontend:** React + TypeScript (Vite), React Router, Tailwind CSS,
  shadcn/ui (Radix + Nova preset, default/neutral theme), React Hook Form + Zod,
  TanStack Query + Axios (for API calls other than Better Auth's own client)
- **Backend:** Express + TypeScript, run directly by Bun, request bodies
  validated with Zod
- **Shared:** a `core` workspace package holding Zod schemas used by both
  `client` and `server` (no build step — both import its `.ts` source
  directly)
- **Database:** PostgreSQL, accessed via Prisma
- **Auth:** [Better Auth](https://www.better-auth.com/), database-backed
  sessions (HTTP-only cookie + server-side session table)
- **E2E testing:** [Playwright](https://playwright.dev/), against a
  separate `helpdesk_test` database (see [Testing](#testing))

## Project structure

```
client/   React app (Vite)
server/   Express API + Prisma schema/migrations
core/     Zod schemas shared by client and server
```

- `client/src/pages/` — routed pages (`Login` — built with shadcn/ui's
  `Card`/`Input`/`Label`/`Button`/`Alert`, wired to the existing
  react-hook-form + Zod validation; `Home`; `Users` — admin-only, loads
  `GET /api/users` (Axios, inside a TanStack Query `useQuery`) and renders
  `CreateUserModal` above a `UsersTable`, passing it the fetched
  `users`/`isPending`; shows the "Failed to load users" alert itself
  instead of the table when the query errors)
- `client/src/components/UsersTable.tsx` — the `users`/`isPending`-driven
  table itself (also exports the `UserListItem`/`UserRole` types): renders
  shadcn/ui `Skeleton` rows while `isPending`, `null` if not pending and
  `users` isn't loaded yet, otherwise the name/email/role/created-date
  rows (falling back to `—` for a null name, "No users found." when the
  array is empty, and a differently-styled badge for `ADMIN` vs `AGENT`),
  plus an `EditUserModal` per row in a trailing actions column (its header
  cell is a visually-hidden "Actions" label, since the column has no
  visible heading otherwise)
- `client/src/components/UserFormFields.tsx` — the `Name`/`Email`/
  `Password` inputs (with labels and Zod error messages) shared by
  `CreateUserModal` and `EditUserModal`, so the two forms can't visually
  or structurally drift apart. Generic over the form's value type
  (constrained to `{ name, email, password? }`, matching both
  `CreateUserInput` and `UpdateUserInput` from `core`); takes
  `passwordAutoComplete` and an optional `passwordHint` (used by the edit
  form to show "Leave blank to keep the current password") so the one
  difference between the two forms' password fields doesn't need two
  copies of the field markup.
- `client/src/components/CreateUserModal.tsx` — "New user" button (shadcn
  `Dialog`) that opens a form using react-hook-form + the shared
  `createUserSchema` from `core` (name min 3 chars, password min 8 chars —
  see `core/src/schemas/user.ts` and Data validation in `CLAUDE.md`),
  submits via a TanStack Query `useMutation` to `POST /api/users`,
  invalidates the `['users']` query on success, and closes the dialog. New
  users are always created with the `AGENT` role — role isn't a form
  field, since it isn't settable via user input (see Authorization in
  `CLAUDE.md`)
- `client/src/components/EditUserModal.tsx` — a `Pencil`-icon (lucide)
  button per row (`aria-label="Edit {name-or-email}"`, since it has no
  visible text) that opens a form pre-filled from its `user` prop, using
  the shared `updateUserSchema` from `core` (same name/email rules as
  create; password is optional — leaving it blank means "don't change
  it"). Resets to the user's current values each time it's opened
  (`reset(...)` in `onOpenChange`, not a continuously-synced `values`
  option) so an unrelated background refetch can't clobber an in-progress
  edit. Submits via `PATCH /api/users/:id`, sending `password: ''` when
  left blank (the server treats an empty/falsy password as "unchanged");
  invalidates `['users']` and closes on success. Role isn't a form field
  here either — it can't be changed from this dialog.
- `client/src/App.tsx` — wraps the router in a `QueryClientProvider`, with
  the `QueryClient` instance held in `useState(() => new QueryClient())` so
  it's created once and stays stable across re-renders
- `client/src/components/` — shared UI (`NavBar`, `ProtectedRoute` — takes an
  `adminOnly` prop that redirects non-admins to `/`, using the `role` field
  Better Auth exposes on `session.user` via the client's `inferAdditionalFields`
  plugin in `auth-client.ts`)
- `client/src/components/ui/` — shadcn/ui components (generated by the
  shadcn CLI; see `client/components.json` for style/theme config)
- `client/src/lib/auth-client.ts` — Better Auth client
- `client/src/lib/utils.ts` — shadcn's `cn()` class-merge helper
- `server/src/auth.ts` — Better Auth server config
- `server/src/middleware/requireAuth.ts` — rejects unauthenticated requests
- `server/src/middleware/requireRole.ts` — `requireRole(role)`, composed
  after `requireAuth`, rejects requests where `req.user.role` doesn't
  match; applied to the whole `usersRouter` (`requireAuth` alone only
  checks "is logged in", not role — the client's `ProtectedRoute
  adminOnly` guard is not itself a security boundary, since it can be
  bypassed by calling the API directly)
- `server/src/index.ts` — creates the Express `app`, registers global
  middleware, and mounts each resource's router; it doesn't define
  resource routes itself (see `server/src/routes/` below). `/api/me`
  (`requireAuth`) returns only `{ user }`, never the raw session object —
  the session's `token` field would otherwise defeat the session cookie's
  `httpOnly` protection. Also defines the single error-handling middleware,
  registered last: translates a Prisma `P2002` (unique constraint) into
  `409`, a Prisma `P2025` (record to update not found) into `404`, and
  falls back to `500` otherwise — the one place that turns a
  thrown/rejected error into a response, since Express 5 forwards a
  rejected promise from an `async` handler to it automatically, so route
  handlers don't need their own `try`/`catch` (see Error handling in
  `CLAUDE.md`). Applies `helmet()` for security headers, `cors()`
  restricted to `trustedOrigins` (with `credentials: true` for the session
  cookie), and an `express-rate-limit` limiter (10 requests / 15 min)
  scoped to `/api/auth/sign-in/email` only — not the whole `/api/auth/*`
  namespace, since that also covers frequent, non-brute-forceable calls
  like session checks and sign-out. The limiter is only registered when
  `NODE_ENV=production` (set by the `start` script), so it's off during
  `bun run dev` and doesn't interfere with local testing
- `server/src/routes/users.ts` — `usersRouter`, mounted at `/api/users` in
  `index.ts`. `usersRouter.use(requireAuth, requireRole('ADMIN'))` guards
  every route on it, so the whole resource is admin-only by construction.
  `GET /` returns all users' `id`/`name`/`email`/`role`/`createdAt` for the
  admin-only Users page. `POST /` validates `name`/`email`/`password` with
  the same `createUserSchema` from `core` the client form uses
  (`createUserSchema.safeParse`, see Data validation in `CLAUDE.md`),
  creates the `User` (with `role: UserRole.AGENT` passed
  explicitly, not left to the Prisma schema's `@default(AGENT)`) + a
  `credential` `Account` row in a transaction (mirroring `seed.ts`'s
  `hashPassword` + `Account` pattern), and returns `201` with the created
  user, `400` on invalid input (the first Zod issue's message), or `409` on
  a duplicate email via `index.ts`'s error-handling middleware. `PATCH /:id`
  validates with `updateUserSchema` (same shape, but `password` optional),
  updates the `User`'s `name`/`email`, and only touches the `credential`
  `Account`'s password (`tx.account.updateMany`) when `password` is
  truthy — an empty string or missing field leaves the stored password
  untouched. Returns `404` (via the same error-handling middleware,
  reacting to Prisma's `P2025`) if the `id` doesn't exist. Neither route
  accepts `role` — it's not part of either schema, so it can't be changed
  through this API
- `server/src/trustedOrigins.ts` — the single source of truth for allowed
  origins (`TRUSTED_ORIGINS` env var, defaulting to
  `http://localhost:5173`), imported by both `auth.ts` (Better Auth's
  `trustedOrigins`) and `index.ts` (the `cors()` origin) so they can't
  drift out of sync
- `core/src/schemas/user.ts` — `createUserSchema`/`updateUserSchema` (and
  their inferred `CreateUserInput`/`UpdateUserInput` types), re-exported
  from `core/src/index.ts`. Both build on local, unexported
  `nameSchema`/`emailSchema` constants (identical rules for create and
  update); `updateUserSchema` additionally makes `password` optional,
  enforcing the min-length rule only when a value is actually given.
  Imported as the `core` workspace package (`"core": "workspace:*"` in
  both `client/package.json` and `server/package.json`) by
  `CreateUserModal.tsx`/`EditUserModal.tsx` and `usersRouter`, so the two
  sides can't drift out of sync on what a valid user looks like. `core`
  has no build step — both consumers resolve and transform its `.ts`
  source directly (Vite via `@fs`, Bun natively)
- `server/prisma/schema.prisma` — data model (`User`, `Ticket`, plus Better
  Auth's `Session`/`Account`/`Verification`)
- `playwright.config.ts` (repo root) — starts the server (port `4100`) and
  client (port `5174`) against the separate test database before running
  specs in `e2e/`; see [Testing](#testing)
- `client/vite.config.ts` — the dev proxy target is
  `process.env.VITE_SERVER_URL ?? 'http://localhost:4000'`, so Playwright
  can redirect it to the test server on `4100` without touching normal dev

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

## Testing

### End-to-end tests

End-to-end tests run with [Playwright](https://playwright.dev/) against a
separate `helpdesk_test` database, so they never touch dev data. Specs live
in `e2e/`:

- `e2e/auth.spec.ts` — sign-in flow: valid login, wrong password, unknown
  email, empty-field and malformed-email client-side validation (red
  border / Zod messages, no request sent), session persistence across a
  reload, sign-out clearing the session server-side, an unauthenticated
  deep link landing on `/` (not the original page) after login, and
  visiting `/login` while already authenticated (redirects to `/`, per
  `Login.tsx`'s own `<Navigate>` when a session exists).
- `e2e/access-control.spec.ts` — `ProtectedRoute` behavior for logged-out
  users (redirect to `/login`, including for unknown routes via the `*`
  catch-all and a direct `/api/me` call returning 401) and role-based
  access (`ADMIN` sees the Users nav link and can open `/users`; `AGENT`
  does not see the link and is redirected away from `/users`).
- `e2e/global-setup.ts` — wired in via `playwright.config.ts`'s
  `globalSetup`. Logs in once per role (`ADMIN`/`AGENT`) through the real
  UI and saves each session as a Playwright `storageState` file under
  `e2e/.auth/` (gitignored). Specs that just need "already logged in as
  role X" as a precondition use `test.use({ storageState: ... })` instead
  of repeating the UI login in every test.
- `e2e/helpers/test-env.ts` — reads `ADMIN_EMAIL`/`ADMIN_PASSWORD`/
  `AGENT_EMAIL`/`AGENT_PASSWORD` from `server/.env.test` at runtime rather
  than hardcoding credentials in spec files.

`server/src/seed.ts` also seeds an `AGENT`-role user when `AGENT_EMAIL`/
`AGENT_PASSWORD` are set (only expected in `server/.env.test`, for the
role-based-access specs above); it stays a no-op for the production/dev
seed, which has no such vars.

**One-time setup**, from the repo root:

1. Create the `helpdesk_test` database (same Postgres server, same
   `helpdesk_app` role as the main `helpdesk` database).
2. Create `server/.env.test` (see `server/.env.test.example` for the
   required keys) — same `DATABASE_URL` as `server/.env` but pointing at
   `helpdesk_test`, plus its own `BETTER_AUTH_SECRET`, and
   `BETTER_AUTH_URL`/`PORT`/`TRUSTED_ORIGINS` set to the test ports below.
   `AGENT_EMAIL`/`AGENT_PASSWORD` are also required here (unlike
   `server/.env`) so `seed:test` creates a non-admin user for the
   role-based-access specs.
3. Install Playwright's browser binaries:
   ```
   bunx playwright install
   ```
4. Apply migrations and seed the test database, from `server/`:
   ```
   bun run migrate:test
   bun run seed:test
   ```

**Running tests:**
```
bun run test:e2e
```
`playwright.config.ts` starts its own server (`http://localhost:4100`,
using `server/.env.test`) and client (`http://localhost:5174`) — separate
ports from normal dev (`4000`/`5173`) so a running dev session never
conflicts with a test run, and tests never run against dev data. Re-run
`bun run migrate:test` in `server/` whenever `prisma/schema.prisma` changes.

### Component tests

Component-level tests for `client/` use [Vitest](https://vitest.dev/) +
[React Testing Library](https://testing-library.com/react), separate from
the Playwright E2E suite above (no server/database involved — API calls are
mocked). Config lives in `client/vite.config.ts`'s `test` block (`jsdom`
environment, `client/src/test/setup.ts` as the setup file, which imports
`@testing-library/jest-dom/vitest` matchers and registers RTL's `cleanup` in
an `afterEach`, since `globals` isn't enabled and RTL only auto-registers
cleanup when it detects a global `afterEach`).

- `client/src/test/render-with-query.tsx` — `renderWithQuery(ui)`, a shared
  helper that renders a component inside a fresh `QueryClientProvider`
  (`retry: false`, so a mocked rejection surfaces immediately instead of
  retrying). Use it for any page/component under test that fetches through
  TanStack Query, instead of wrapping each test file's own
  `QueryClientProvider`.
- `client/src/pages/Users.test.tsx` — mocks `axios` (factory mock, not
  Vitest's automock, so `axios.get` is a plain `vi.fn()`) and mocks `NavBar`
  out entirely (it depends on Better Auth's `useSession`, which is
  unrelated to what this page renders) to test `Users.tsx` in isolation via
  `renderWithQuery`: the fetched data reaching the table, and the error
  alert on a rejected request (instead of the table). Doesn't re-test
  `UsersTable`'s own rendering (loading/empty/badge styling) — that's
  `UsersTable.test.tsx`'s job. Also covers the `CreateUserModal` dialog
  from the page level, via `@testing-library/user-event`: clicking "New
  user" shows it (`getByRole('dialog')`), and it closes both on `Escape`
  and on a click on the dialog overlay (`[data-slot="dialog-overlay"]`) —
  both are Radix `Dialog`'s own default dismiss behavior, not custom code,
  so these tests are really guarding against a future change (e.g. a
  `onPointerDownOutside`/`onEscapeKeyDown` override) accidentally
  disabling it.
- `client/src/components/UsersTable.test.tsx` — uses `renderWithQuery`
  (needed now that each row's `EditUserModal` calls `useQueryClient`, even
  though `UsersTable` itself still just takes `users`/`isPending` as props
  and doesn't fetch) covering its states directly: loading skeletons,
  `null` when not pending with no `users` yet, the fetched rows (including
  the `—` fallback for a null `name`), the `ADMIN` vs `AGENT` badge
  styling, the empty state, and that each row has its own edit button
  (`getByRole('button', { name: 'Edit <name-or-email>' })`).
- `client/src/components/CreateUserModal.test.tsx` — mocks `axios` (`post` +
  `isAxiosError`) and drives the dialog with `@testing-library/user-event`:
  opening it, the Zod validation messages for a short name/password and an
  invalid email, the required-field errors on an empty submit, a valid
  submit calling `POST /api/users` and closing the dialog, the submit
  button showing a disabled "Creating…" state while that request is in
  flight (a manually-resolved `Promise` held open mid-test), the error
  alert on a rejected request (e.g. duplicate email), and the form/error
  resetting when the dialog is closed (`Escape`) and reopened.
- `client/src/components/EditUserModal.test.tsx` — same approach, mocking
  `axios.patch` instead of `axios.post`: opens pre-filled with the given
  user's name/email and a blank password (plus the "Leave blank to keep
  the current password" hint), the same name/email validation messages,
  rejecting a too-short password while still allowing a blank one, a
  submit with a blank password sending `password: ''` to `PATCH
  /api/users/:id` (name/email only change), a submit with a password
  including it in the request, the error alert on a rejected request, and
  resetting to the user's current data (not a blank form, unlike create)
  when closed and reopened.

**Running tests:**
```
cd client && bun run test:component
```
(`bun run test` is an identical alias, kept for brevity in ad hoc use; `bun
run test:watch` re-runs on file changes while writing a spec.)

## Known issues

**No lockfile.** `bun install` on this machine fails writing
`bun.lock`/`bun.lockb` due to a confirmed incompatibility between this
Windows build and the active antivirus's filesystem filter driver — not a
project config issue. Always install with `bun install --no-save`;
dependency versions are still pinned exactly in each `package.json`. Do not
work around this with antivirus exclusions.

This also breaks third-party CLIs that shell out to `bun add`/`bun install`
internally without `--no-save` (e.g. `npx shadcn@latest add <component>` —
root `package.json` sets `"packageManager": "bun@1.4.0"` so such tools pick
bun over npm). Declaring the package in the relevant `package.json` first
narrows what the tool still tries to add, but doesn't avoid the crash for
whatever it always re-adds (e.g. shadcn's CLI always re-adds itself as a
devDependency). The reliable fix: put a throwaway `bun.cmd` shim earlier on
`PATH` for that one command that forwards to the real `bun.exe` with
`--no-save` appended to `add`/`install`, e.g.:
```
@echo off
setlocal
set REALBUN=%USERPROFILE%\.bun\bin\bun.exe
set CMD=%~1
shift
set ARGS=
:loop
if "%~1"=="" goto done
set ARGS=%ARGS% "%~1"
shift
goto loop
:done
if /i "%CMD%"=="add" ( "%REALBUN%" add --no-save %ARGS% & exit /b %ERRORLEVEL% )
if /i "%CMD%"=="install" ( "%REALBUN%" install --no-save %ARGS% & exit /b %ERRORLEVEL% )
"%REALBUN%" %CMD% %ARGS%
```
Prepend its directory to `$env:PATH` for that one shell invocation only —
it's a wrapper around a build tool, not an antivirus change, and it's
disposable (no need to keep it around after the command finishes).
