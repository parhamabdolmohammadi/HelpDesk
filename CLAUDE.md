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
