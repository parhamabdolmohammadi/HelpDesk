# Single-service deploy: this server serves both the API (/api/*) and the
# built client SPA (everything else) from the same origin — see the
# production block in server/src/index.ts. That keeps the session cookie
# same-origin in production, avoiding cross-origin cookie/CORS complexity
# a two-service (separate client/server) deploy would otherwise need.
#
# Pinned to the same Bun version as "packageManager" in package.json —
# check that field before bumping this.
FROM oven/bun:1.4.0

WORKDIR /app

# Install dependencies for the whole workspace first, from just the
# package.json files, so this layer is cached across builds that only
# change source — not dependencies. There's no committed lockfile (see
# CLAUDE.md's "no lockfile" known issue — an unrelated Windows/antivirus
# problem on the maintainer's dev machine); inside this Linux container
# `bun install` just resolves fresh from each package.json's pinned ranges.
COPY package.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY core/package.json core/
RUN bun install

COPY . .

# Prisma's query engine isn't needed at runtime (server/src/db.ts uses the
# @prisma/adapter-pg driver adapter instead), but `generate` still has to
# run once to produce server/src/generated/prisma, and the CLI's own
# migrate/schema-engine binary is still required for `migrate deploy` below.
RUN cd server && bunx prisma generate

# Needs only node_modules resolved, not any runtime env vars.
RUN cd client && bun run build

ENV NODE_ENV=production

# No EXPOSE: Railway injects its own PORT env var at runtime and routes to
# whatever port the app actually listens on (server/src/index.ts already
# reads process.env.PORT), so a hardcoded EXPOSE number here would just be
# misleading rather than meaningful.
WORKDIR /app/server

# Applies any pending migrations against DATABASE_URL before every start —
# `migrate deploy` is safe to re-run (no-ops once up to date), so this
# doesn't need to be a separate Railway release step.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]
