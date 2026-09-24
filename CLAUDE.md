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
- Root `package.json` defines a Bun workspace over `client` and `server`

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
  role). As of this writing it isn't applied anywhere yet because no
  admin-only API route exists — apply it to the first one that's added
  (e.g. a future `/api/users`), don't ship it guarded only by
  `ProtectedRoute`.
- `client/src/lib/auth-client.ts` uses Better Auth's `inferAdditionalFields`
  client plugin (manually specified, not inferred from a shared server
  type, since client/server are separate packages) so `session.user.role`
  is typed. Without it, `role` isn't visible on the client's session type
  even though the server sends it.

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