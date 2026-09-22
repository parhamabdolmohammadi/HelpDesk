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
