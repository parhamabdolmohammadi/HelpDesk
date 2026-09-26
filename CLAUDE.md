# Help Desk

AI-powered ticket management system. See `project-scope.md` for the full
problem/solution writeup and open questions, `techstack.md` for the chosen
stack, and `implementation-plan.md` for the phased task breakdown.

## Documentation

Use Context7 MCP to fetch current documentation whenever working with a
library, framework, SDK, API, CLI tool, or cloud service used in this project
(React, Vite, Express, Bun, Prisma, the Claude API, etc.) — for setup,
configuration, API syntax, version migration, or debugging. Prefer it over
relying on training data or web search for library docs, since APIs in this
stack change quickly.

## Structure

- `client/` — React + TypeScript, built with Vite
- `server/` — Express + TypeScript, run directly by Bun (no separate build step)
  - `server/src/index.ts` — creates the `app`, registers global middleware
    (helmet/cors/rate-limit/Better Auth/`express.json`/the error handler),
    and mounts each resource's router. It does not define resource routes
    itself.
  - `server/src/routes/` — one file per API resource, each exporting an
    Express `Router` mounted in `index.ts` (e.g. `users.ts` → `usersRouter`,
    mounted at `app.use('/api/users', usersRouter)`). A resource's request
    schema, if shared with the client, is imported from `core/` (see Data
    validation below) rather than redefined here; middleware composition
    for the whole resource (e.g. `usersRouter.use(requireAuth,
    requireRole('ADMIN'))`) lives in its route file, not in `index.ts`. New
    endpoints for an existing resource (e.g. `PATCH`/`DELETE` on a user) go
    in that resource's existing route file; a genuinely new resource gets
    its own new file here.
- `core/` — plain TypeScript, no build step (both `client` and `server`
  import its `.ts` source directly as a workspace package named `core`).
  Holds code shared between `client` and `server` — currently just Zod
  schemas in `core/src/schemas/`, re-exported from `core/src/index.ts` (see
  Data validation below). Not for anything client-only or server-only.
- Root `package.json` defines a Bun workspace over `client`, `server`, and
  `core`

## Running the apps

From `server/`:
```
bun run dev
```
Starts the Express server on http://localhost:4000.

From `client/`:
```
bun run dev
```
Starts the Vite dev server (http://localhost:5173, or next free port).
Requests to `/api/*` are proxied to the server on port 4000.

## Database

Local PostgreSQL 17 (Windows service `postgresql-x64-17`), database `helpdesk`,
accessed via a dedicated `helpdesk_app` role (not the `postgres` superuser) with
`CREATEDB` granted so Prisma Migrate can manage its shadow database.

Prisma is pinned to `^7.10.0` in `server/package.json` — **do not install
`prisma@latest`**, since at the time this was set up the `latest` npm dist-tag
pointed at an `8.0.0-rc.*` release candidate with a different `prisma init`
behavior (no schema scaffolding) and CLI flags. Check `npm view prisma
dist-tags` before ever bumping this.

Config/schema layout (Prisma ORM 7, which requires a config file and a custom
client output path — see https://pris.ly/getting-started):
- `server/prisma7.config.ts` — Prisma CLI config (schema/migrations paths,
  `DATABASE_URL`)
- `server/prisma/schema.prisma` — models, generator outputs the client to
  `server/src/generated/prisma`
- `server/src/db.ts` — the app's `PrismaClient` singleton, using the
  `@prisma/adapter-pg` driver adapter (required in Prisma 7's new client)
- `server/.env` — holds `DATABASE_URL`; must live in `server/`, not the repo
  root, since Bun (and Prisma when run via Bun) only auto-loads `.env` from
  the current working directory, not parent directories

After changing `prisma/schema.prisma`, from `server/`:
```
bunx prisma migrate dev --name <description>
bunx prisma generate
```

## Authentication

[Better Auth](https://www.better-auth.com/), email/password only, with
database-backed sessions (no JWT) via `@better-auth/prisma-adapter`.

- `server/src/auth.ts` — the `betterAuth()` config. `emailAndPassword` is
  enabled with `requireEmailVerification: false` and **`disableSignUp:
  true`** — there is no public registration endpoint. New users only get
  created via the seed script (see below) or directly in the database.
  `trustedOrigins` reads the single `TRUSTED_ORIGINS` env var (see the
  origin-mismatch known issue below). The `User` model has an
  additional `role` field (`ADMIN` | `AGENT`, default `AGENT`, not
  settable via user input — only set directly via Prisma, e.g. in the
  seed script).
- `server/src/index.ts` mounts Better Auth's handler with
  `app.all('/api/auth/*splat', toNodeHandler(auth), ...)` **before**
  `express.json()` is registered — Better Auth parses its own request
  body, so don't move `express.json()` above it or move auth routes
  below it.
- `server/src/middleware/requireAuth.ts` — Express middleware for
  protecting API routes. Calls `auth.api.getSession()`, attaches
  `req.user`/`req.session`, and responds `401` if there's no session.
  Apply it to any route that needs a logged-in user (see `/api/me` in
  `server/src/index.ts` for the pattern).
- `client/src/lib/auth-client.ts` — `createAuthClient()` from
  `better-auth/react` with no explicit `baseURL`, so it makes relative
  requests from whatever origin the page is served on. This only works
  because `client/vite.config.ts` proxies `/api/*` to the server on port
  4000 — the browser never talks to port 4000 directly. Exports
  `useSession`, `signIn`, `signOut`.
- `client/src/components/ProtectedRoute.tsx` — client-side route guard;
  wraps a route element, shows a loading state while `useSession()` is
  pending, and redirects to `/login` if there's no session.
- Schema (`server/prisma/schema.prisma`): Better Auth's `User`/
  `Session`/`Account`/`Verification` models, mapped to lowercase table
  names (`@@map("user")` etc.) to match Better Auth's Postgres adapter
  expectations.

**Creating users:** there's no sign-up UI or endpoint. Run the seed
script from `server/`:
```
bun run seed
```
It reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `server/.env`, and no-ops
if a user with that email already exists (it does **not** update the
password on a re-run — if you change `ADMIN_PASSWORD` in `.env` after
the user already exists, the stored password hash still reflects the
old value until the user row is deleted and reseeded). It hashes the
password with `hashPassword` from `better-auth/crypto` directly, so the
resulting hash is verifiable by Better Auth's own sign-in flow, and
creates the `Account` row with `providerId: "credential"`.

## Authorization

Role (`ADMIN` | `AGENT`) is enforced separately on the client and server —
neither alone is sufficient, and new admin-only features need both:

- **Client:** `client/src/components/ProtectedRoute.tsx` takes an
  `adminOnly` prop; when set, it redirects to `/` unless
  `session.user.role === "ADMIN"`. This is a UX guard only, not a security
  boundary — it can be bypassed by calling the API directly.
- **Server:** `server/src/middleware/requireRole.ts` exports
  `requireRole(role)`, meant to compose after `requireAuth` on any
  admin-only route (`requireAuth` alone only checks "is logged in", not
  role). Applied to the whole `usersRouter` in `server/src/routes/users.ts`
  (`usersRouter.use(requireAuth, requireRole('ADMIN'))`) — every route on
  that router is admin-only by construction, so a new route added to it
  doesn't need to remember to add the guard itself. Don't ship a new
  admin-only route guarded only by `ProtectedRoute`.
- `client/src/lib/auth-client.ts` uses Better Auth's `inferAdditionalFields`
  client plugin (manually specified, not inferred from a shared server
  type, since client/server are separate packages) so `session.user.role`
  is typed. Without it, `role` isn't visible on the client's session type
  even though the server sends it.
- `role` is always the `UserRole` enum from
  `server/src/generated/prisma/client.ts` (`UserRole.ADMIN` /
  `UserRole.AGENT`), never a raw string, anywhere a `User` row is created
  or compared server-side — see `usersRouter`'s `POST /` (explicitly passes
  `role: UserRole.AGENT`, rather than silently relying on the Prisma
  schema's `@default(AGENT)`) and `seed.ts`, which follows the same
  pattern.

## UI

`client/` uses shadcn/ui (style `radix-nova`, `neutral` base color — the
default theme). Config lives in `client/components.json`; generated
components go in `client/src/components/ui/` and are not meant to be hand-
edited beyond normal component work. The `@/*` import alias points at
`client/src` (configured in `tsconfig.json`, `tsconfig.app.json`, and
`vite.config.ts` — no `baseUrl`, since this project's TypeScript version
deprecates it and `moduleResolution: "bundler"` supports bare `paths`).

Root `package.json` sets `"packageManager": "bun@1.4.0"` so CLIs that shell
out to a package manager (like the shadcn CLI) pick bun over npm — npm's
arborist crashes on this repo's nested Bun workspace layout.

The shadcn CLI's own newer registry has no separate `form` wrapper component
(dropped when they added multi-library support for base/radix/aria) — pages
just use `register()` from react-hook-form directly with the raw
`Input`/`Label` components, as already done elsewhere in this project.

To add more components: `npx shadcn@latest add <component>`. This calls
`bun add` internally without `--no-save`, so it hits the lockfile bug below —
see that section's workaround.

## Data fetching

Client-side calls to this project's own API (anything other than Better
Auth's own client, see `auth-client.ts` above) use **Axios** for the HTTP
call and **TanStack Query** (`useQuery`/`useMutation`) for the async state
around it — not raw `fetch` and not manual `useEffect`/`useState` loading
state. New pages that load data from `/api/*` should follow the pattern in
`client/src/pages/Users.tsx`:

```ts
const { data, isPending, isError } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const response = await axios.get('/api/users', { withCredentials: true })
    return response.data.users
  },
})
```

- `client/src/App.tsx` wraps the router in a `QueryClientProvider`, with the
  `QueryClient` created once via `useState(() => new QueryClient())` so it's
  stable across re-renders — reuse that existing provider/client rather than
  creating a new one per page.
- Axios calls need `withCredentials: true` to send the session cookie, same
  reason `cors()` on the server needs `credentials: true` (see Security
  middleware below).

## Data validation

Both client and server validate with **Zod** — not manual type/length checks
inline in a route handler. Use `z.object({...}).safeParse(...)` and return
its first issue's message, rather than hand-rolled `typeof`/regex checks.

**Define the schema once, in `core/`, and import it from both sides** —
don't redeclare the same shape separately in `client/` and `server/`, since
they'd silently drift out of sync. `core/src/schemas/` holds one file per
form/request shape (e.g. `core/src/schemas/user.ts` exports
`createUserSchema` and its inferred `CreateUserInput` type), re-exported
from `core/src/index.ts`. Both `client/package.json` and
`server/package.json` depend on it as `"core": "workspace:*"` (a Bun
workspace — see Structure above), so either side imports it as a normal
package: `import { createUserSchema } from 'core'`. A schema used by only
one side (e.g. a client-only UI-state shape with no server counterpart)
doesn't need to move to `core` — this is specifically for shapes validated
on both ends, like an API request body that's also a form.

- **Client:** form input, via `react-hook-form`'s `zodResolver` passed a
  `core` schema — see `client/src/pages/Login.tsx` (a login-only shape, not
  shared, so defined locally), `client/src/components/CreateUserModal.tsx`
  (`createUserSchema`, password required), and
  `client/src/components/EditUserModal.tsx` (`updateUserSchema`, password
  optional — blank means "don't change it"). Both modals render their
  fields via the shared `client/src/components/UserFormFields.tsx` rather
  than each declaring their own `Name`/`Email`/`Password` JSX; it's generic
  over the form's value type (constrained to
  `{ name, email, password? }`) so it works with either schema's inferred
  type.
- **Server:** request bodies, via `schema.safeParse(req.body)` using the
  same imported schema, returning the first issue's message on `400` — see
  `usersRouter`'s `POST /` and `PATCH /:id` in `server/src/routes/users.ts`:
  ```ts
  import { createUserSchema } from 'core'

  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }
  ```
  New request-body-accepting routes should follow this pattern — add the
  schema to `core` if the client validates the same shape, otherwise define
  it locally in the route file — rather than adding ad hoc inline checks.
- `core/src/schemas/user.ts` factors the `name`/`email` checks (identical
  between create and update) into local, unexported `nameSchema`/
  `emailSchema` constants that both `createUserSchema` and
  `updateUserSchema` build on — a case where a schema is shared within
  `core` itself, not just between `client` and `server`. `updateUserSchema`
  makes `password` optional and only enforces the min-length check when a
  value is actually given (`.refine((v) => !v || v.length >= 8, ...)`), so
  an empty/omitted password means "leave it unchanged" both in validation
  and in `usersRouter`'s `PATCH /:id` handler (`if (password) { ...update
  the Account row... }`) — the falsy check is deliberately the same on
  both sides.

## Error handling

Express 5 (used here — see `server/package.json`) automatically catches a
rejected promise returned from an `async` route/middleware handler and
forwards it to the error-handling middleware, the same as calling `next(err)`
manually. Route handlers in `server/src/index.ts` rely on this and don't
wrap their body in `try`/`catch` — a plain `await` that throws is enough.
(This is an Express 5 behavior change; it did not do this in Express 4,
which is why older Express code is full of manual `try`/`catch` + `next(err)`
in every async handler.)

A single error-handling middleware, registered last in `server/src/index.ts`
(after every route), is the one place that turns a thrown error into a
response:
```ts
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ status: 'error', message: 'A user with this email already exists' })
      return
    }

    if (err.code === 'P2025') {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }
  }

  console.error(err)
  res.status(500).json({ status: 'error', message: 'Internal server error' })
})
```
A route that needs to turn a specific failure into a specific status code
(e.g. `P2002` → `409`, or Prisma's "record to update not found" `P2025` →
`404` for `PATCH /:id` on a nonexistent user) still does that in this
shared middleware, not with its own `try`/`catch` — add another `if`
branch here rather than reintroducing per-route error handling.

## Security middleware

All applied in `server/src/index.ts`, before the Better Auth handler and
routes:

- `helmet()` — sets standard security headers on every response. Its
  bundled types don't match Express 5's `RequestHandler` type (same
  mismatch as Better Auth's `toNodeHandler`), so it's cast with `as
  unknown as express.RequestHandler` — a known type-only issue, not a
  runtime problem.
- `cors({ origin: trustedOrigins, credentials: true })` —
  `server/src/trustedOrigins.ts` is the single source of truth for the
  allowed origin list (from `TRUSTED_ORIGINS`, defaulting to
  `http://localhost:5173`), imported by both this and
  `server/src/auth.ts`'s `trustedOrigins` config so they can't drift out
  of sync. `credentials: true` is required for the session cookie to be
  sent cross-origin (client on 5173, API on 4000 in dev).
- `express-rate-limit`, scoped to `/api/auth/sign-in/email` only (10
  requests / 15 min) — not the whole `/api/auth/*` namespace, since that
  also covers frequent, non-brute-forceable calls like session checks and
  sign-out. **Only registered when `process.env.NODE_ENV === 'production'`**
  (set by the `start` script) — it's off for `bun run dev` and for the
  Playwright test server (see Testing below) so local development and
  tests are never throttled.

## Testing

End-to-end tests use [Playwright](https://playwright.dev/)
(`playwright.config.ts` at the repo root, specs in `e2e/`). For the test
infrastructure — the separate `helpdesk_test` database, dedicated test
ports, and how to write/run specs — see the `e2e-test-writer` subagent
(`.claude/agents/e2e-test-writer.md`), which owns this project's E2E
testing conventions.

**Use the `e2e-test-writer` subagent for any task that involves writing,
updating, or extending E2E specs** (new `e2e/*.spec.ts` files, testing a
new user flow, updating a spec after a UI/route change) instead of writing
Playwright tests directly — it has this project's test-infrastructure and
app-specific conventions loaded so tests come out consistent. Writing or
touching `playwright.config.ts` itself, or one-off manual verification
(e.g. spinning up the test server to sanity-check something), doesn't need
the subagent.

### Component tests

Component-level tests for `client/` (rendering a single page/component with
mocked API calls — no server, no database, no browser) are a **separate
layer from E2E, not owned by `e2e-test-writer`**: [Vitest](https://vitest.dev/)
+ [React Testing Library](https://testing-library.com/react).

**When to add one:** any new or changed page/component that has more than
trivial render logic — data fetched from the API, distinct loading/error/
empty states, conditional styling/branches — should get a component test
alongside it, the same way a new user-facing flow gets an E2E spec.

**Where it goes:** colocate as `<ComponentName>.test.tsx` next to the
component it tests (e.g. `client/src/pages/Users.tsx` →
`client/src/pages/Users.test.tsx`), not in a separate `__tests__/` tree.

**How to write one**, following `client/src/pages/Users.test.tsx` as the
reference:
- If the component fetches through TanStack Query, render it with
  `renderWithQuery` from `client/src/test/render-with-query.tsx` instead of
  hand-rolling a `QueryClientProvider` per test file — it creates a fresh
  `QueryClient` per render with `retry: false`, so a mocked rejection
  surfaces immediately instead of retrying.
- Mock `axios` with an explicit factory
  (`vi.mock('axios', () => ({ default: { get: vi.fn() } }))`), not Vitest's
  automock — it doesn't reliably reproduce axios's callable-object-with-
  methods shape.
- Mock out unrelated child components that pull in concerns outside what's
  under test — e.g. `NavBar`, which depends on Better Auth's `useSession`
  and has nothing to do with a given page's own logic.
- Config lives in the `test` block of `client/vite.config.ts` (`jsdom`
  environment); `client/src/test/setup.ts` is the setup file (imports
  `@testing-library/jest-dom/vitest` matchers and registers RTL's `cleanup`
  in an `afterEach` — required because `globals` is off, so RTL won't
  auto-register cleanup on its own).

**How to run them**, from `client/`:
```
bun run test:component   # run once (used in CI / before considering a task done)
bun run test:watch       # watch mode, for iterating while writing a spec
```
(`bun run test` is an identical alias to `test:component`, kept because it
predates that name.)

## Known issue: no lockfile

`bun install` on this machine fails when writing `bun.lock`/`bun.lockb`
(`EINVAL: Failed to replace old lockfile ... NtSetInformationFile`). This is a
confirmed incompatibility between this Windows build and the active
third-party antivirus's file-system filter driver, not a bug in this project's
config — reproduced across Bun versions and both lockfile formats, and
unrelated to which folder the project lives in.

**Do not work around this by adding antivirus exclusions or disabling
protection.** Until the AV vendor ships a fix, install dependencies with:
```
bun install --no-save
```
This installs packages into `node_modules` normally; it just skips writing
the lockfile. Dependency versions are still pinned exactly in each
`package.json` in the meantime.

This also breaks any third-party CLI that shells out to `bun add`/
`bun install` internally without `--no-save` (e.g. `npx shadcn@latest add
<component>`). Declaring the package in the relevant `package.json` first
narrows what the tool still tries to add, but doesn't avoid the crash for
whatever it always re-adds regardless (e.g. shadcn's CLI always re-adds
itself as a devDependency). The reliable fix: put a throwaway `bun.cmd` shim
earlier on `PATH` for that one command that forwards to the real `bun.exe`
with `--no-save` appended to `add`/`install` (full script in `README.md`'s
Known Issues section) — it's a wrapper around a build tool, not an
antivirus change, and it's disposable.

## Known issue: login fails with "Missing or null Origin"

Better Auth (`server/src/auth.ts`) rejects sign-in unless the request's
Origin header exactly matches `TRUSTED_ORIGINS` in `server/.env` (currently
`http://localhost:5173`). Vite auto-increments to the next free port
(5174, 5175, ...) when 5173 is already taken — which happens easily during a
dev session if an earlier `bun run dev` was left running in another terminal
(including ones started for testing during a Claude Code session and not
cleaned up). If login fails with this error, or with a generic-looking
failure that turns out on inspection (browser Network tab, or a direct
`curl`/`fetch` to `/api/auth/sign-in/email`) to be a 403 origin rejection,
check that the browser is actually pointed at `http://localhost:5173` and
not a stale tab on a different port; free up the lower ports or update
`TRUSTED_ORIGINS` to match rather than debugging the credentials.

everytime update the ReadMe.md if any important change occurs