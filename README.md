# Help Desk

An AI-powered support ticket system. Customers' emails become tickets
automatically; AI classifies them, answers the ones it can confidently
resolve from a knowledge base, and leaves the rest for a human agent —
with a dashboard to track how much work the AI is actually taking off
your team's plate.

## What it does

- **Tickets come in automatically.** A webhook turns an inbound support
  email into a ticket. Replies to an existing open conversation are
  appended to it instead of starting a new one.
- **AI classifies every new ticket** — General Question, Technical
  Question, or Refund Request — without slowing down the webhook that
  created it (classification happens in the background).
- **AI tries to resolve it on its own.** Using a support knowledge base
  (`server/knowledge-base.md`), the AI answers tickets it's confident
  about and marks them resolved — addressing the customer by name, in a
  professional tone, signed by the support team. Anything it's not
  confident about (refund requests outside policy, legal threats,
  disputes, account security) is left open for a human.
- **Agents can reply, with AI help.** A reply can be polished for
  grammar/tone before sending, and a ticket's whole thread can be
  summarized on demand.
- **Anyone can submit a ticket**, not just external customers — logged-in
  staff can file their own from the homepage, with AI help writing the
  subject and description, and see their own submissions listed below the
  form.
- **A dashboard** shows total/open tickets, how many (and what percent)
  were resolved by AI, average resolution time, and a 30-day volume chart.
- **Role-based access.** Admins can manage any ticket; a regular agent can
  only manage one they submitted themselves. Only admins can manage users.

## Tech stack

- **Frontend:** React + TypeScript (Vite), React Router, Tailwind CSS,
  shadcn/ui, React Hook Form + Zod, TanStack Query + Axios, Recharts
- **Backend:** Express + TypeScript, run directly by [Bun](https://bun.sh)
- **Database:** PostgreSQL via Prisma (using the `@prisma/adapter-pg`
  driver adapter)
- **Background jobs:** [pg-boss](https://github.com/timgit/pg-boss) — runs
  ticket classification and auto-resolution without blocking requests
- **AI:** [Vercel AI SDK](https://ai-sdk.dev/) + OpenAI (`gpt-5-nano`)
- **Auth:** [Better Auth](https://www.better-auth.com/), email/password
  with database-backed sessions
- **Shared code:** a `core` workspace package of Zod schemas used by both
  `client` and `server`, so form validation can't drift between the two

## Project structure

```
client/   React app (Vite)
server/   Express API, Prisma schema/migrations, background jobs
core/     Zod schemas shared by client and server
e2e/      Playwright end-to-end tests
```

For a deep dive into how a specific feature is implemented, see
[`CLAUDE.md`](./CLAUDE.md) — it documents conventions and non-obvious
decisions file by file.

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- A PostgreSQL database (this project was built against a cloud-hosted
  [Neon](https://neon.tech) database, but any Postgres works)
- An OpenAI API key, for the AI features

### Setup

1. Install dependencies from the repo root:
   ```
   bun install --no-save
   ```
   (See [Known issues](#known-issues) for why `--no-save`.)

2. Create `server/.env` — copy `server/.env.example` and fill in:

   | Variable | What it's for |
   | --- | --- |
   | `DATABASE_URL` | Postgres connection string |
   | `BETTER_AUTH_SECRET` | random 32+ char string (`openssl rand -base64 32`) |
   | `BETTER_AUTH_URL` | `http://localhost:4000` |
   | `TRUSTED_ORIGINS` | `http://localhost:5173` (the client's dev origin) |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | credentials for the seeded admin account |
   | `INBOUND_EMAIL_WEBHOOK_SECRET` | any high-entropy string — authenticates the inbound-email webhook |
   | `OPENAI_API_KEY` | powers classification, auto-resolution, polishing, and summaries |

3. Set up the database, from `server/`:
   ```
   bunx prisma migrate dev
   bunx prisma generate
   bun run seed
   ```

### Running the app

Two terminals, from the repo root:

```
cd server && bun run dev   # http://localhost:4000
```
```
cd client && bun run dev   # http://localhost:5173 (or next free port)
```

Open `http://localhost:5173` and sign in with the admin credentials from
your `.env`. There's no sign-up page — see [`CLAUDE.md`](./CLAUDE.md) for
how to create more users.

### Creating a ticket without a real email provider

No email provider is wired up yet, so simulate an inbound email directly:

```
curl -X POST http://localhost:4000/api/tickets/inbound-email \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <your INBOUND_EMAIL_WEBHOOK_SECRET>" \
  -d '{
    "from": "jane@example.com",
    "senderName": "Jane Doe",
    "subject": "Forgot my password",
    "text": "Hi, I forgot my password. How do I reset it?"
  }'
```

## Running with Docker

A single container runs everything — the API and the built frontend,
served from the same origin:

```
docker build -t helpdesk .
docker run -d --name helpdesk --env-file server/.env \
  -e PORT=3000 -e TRUSTED_ORIGINS=http://localhost:3000 \
  -p 3000:3000 helpdesk
```

Open `http://localhost:3000`. Database migrations run automatically on
container start.

## Deploying to Railway

This repo deploys to [Railway](https://railway.app) as-is — `railway.toml`
and the root `Dockerfile` are already set up for it. Point a Railway
service at this repo and set the same environment variables listed in
[Setup](#setup) above, plus make sure `BETTER_AUTH_URL` and
`TRUSTED_ORIGINS` match the Railway-assigned URL exactly.

After the first deploy, run the seed script once via Railway's shell (or a
one-off command) to create the initial admin account:
```
bun run seed
```

## Testing

**End-to-end** ([Playwright](https://playwright.dev/), against a separate
`helpdesk_test` database):
```
bun run test:e2e
```
One-time setup (create a `helpdesk_test` database, `server/.env.test` from
`server/.env.test.example`, then from `server/`: `bunx playwright install`,
`bun run migrate:test`, `bun run seed:test`) — see
[`.claude/agents/e2e-test-writer.md`](./.claude/agents/e2e-test-writer.md)
for details.

**Component tests** ([Vitest](https://vitest.dev/) + React Testing
Library, no server or database involved), from `client/`:
```
bun run test:component
```

## Known issues

**No committed lockfile.** `bun install` fails to write `bun.lock` on the
original dev machine, due to a Windows/antivirus incompatibility — not a
project configuration problem. Always install with `bun install --no-save`;
every dependency is still pinned exactly in its `package.json`.

**Vite picks a different port if 5173 is taken.** If sign-in fails with a
"Missing or null Origin" error, check that your browser is actually on
`http://localhost:5173` and not a higher port from a leftover dev server,
or update `TRUSTED_ORIGINS` to match.
