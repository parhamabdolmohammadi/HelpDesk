# Implementation Pln

Assumptions made where `project-scope.md` still has open questions (flagged inline
with ⚠️). Revisit these once those questions are answered — some tasks may change.

## Phase 1: Project Setup

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Set up Express server with TypeScript
- [ ] Set up React app with TypeScript
- [ ] Set up PostgreSQL database
## Phase 2 — Authentication

- [ ] Implement signup/login endpoints (password hashing, e.g. bcrypt)
- [ ] Implement database-backed session auth (HTTP-only cookie + server-side session table)
- [ ] Implement logout endpoint (destroy session)
- [ ] Implement auth middleware (require login on protected routes)
- [ ] Implement role-check middleware (admin-only routes)
- [ ] Build login page (frontend)
- [ ] Build auth context/hook for the frontend (current user, logout, redirect if unauthenticated)
- [ ] Route protection on the frontend (redirect to login when no session)

## Phase 3 — User Management

- [ ] ⚠️ Confirm roles beyond admin/agent, if any
- [ ] API: create agent account (admin only)
- [ ] API: list users
- [ ] API: update user (role, deactivate)
- [ ] API: delete/deactivate user
- [ ] Frontend: admin user management page (list, create, edit, deactivate)
- [ ] ⚠️ Clarify "admin can create additional pages" and build once confirmed
      (new ticket categories vs. new dashboard views vs. something else)

## Phase 4 — Ticket CRUD

- [ ] API: create ticket (manual, for testing before email ingestion exists)
- [ ] API: list tickets (filter by status/category, sort)
- [ ] API: get single ticket
- [ ] API: update ticket (status, category, assignee)
- [ ] Frontend: ticket list page with filter/sort controls
- [ ] Frontend: ticket detail page (view + manual status/category change)
- [ ] Seed script with sample tickets for local development

## Phase 5 — AI Features

- [ ] Set up Claude API client/wrapper on the backend
- [ ] AI classification: ticket text → category, using structured output
- [ ] AI summary: generate a short summary for a ticket/thread
- [ ] Knowledge base storage: add `pgvector` extension, embeddings table
- [ ] Knowledge base ingestion pipeline (chunk + embed source docs)
- [ ] Admin UI: manage knowledge base entries (add/edit/remove source docs)
- [ ] AI-suggested reply: retrieve relevant KB chunks (RAG) + generate a draft reply
- [ ] ⚠️ Confirm whether AI replies are auto-sent or always require agent approval
      (assuming **draft-for-review by default**, with send being a separate,
      explicit agent action)
- [ ] Frontend: show AI summary, suggested category, and suggested reply on ticket detail
- [ ] Frontend: let agent edit/accept/reject the suggested reply before sending

## Phase 6 — Email Integration

- [ ] ⚠️ Confirm inbound provider and mailbox source (assuming SendGrid/Mailgun inbound parse webhook)
- [ ] Implement inbound webhook endpoint → parse email → create ticket
- [ ] Run new inbound tickets through AI classification automatically
- [ ] Handle threading: match reply emails to existing tickets
- [ ] Implement outbound send (agent reply → email to requester) via SendGrid/Mailgun
- [ ] Store full email/reply history on the ticket (audit trail)
- [ ] Error handling for malformed/spam inbound emails

## Phase 7 — Dashboard

- [ ] API: aggregate ticket stats (counts by status, by category)
- [ ] Frontend: dashboard overview page with stat tiles
- [ ] Frontend: category breakdown chart
- [ ] Frontend: quick filters (e.g. "my open tickets", "unassigned")
- [ ] Link dashboard tiles/charts through to the filtered ticket list

## Phase 8 — Polish & Deployment

- [ ] Input validation on all forms and API endpoints
- [ ] Loading/error/empty states across all pages
- [ ] Basic automated tests (auth, ticket CRUD, classification endpoint)
- [ ] Write Dockerfiles for frontend and backend
- [ ] Docker Compose for local full-stack dev (app + Postgres)
- [ ] Choose and configure hosting (AWS, Railway, or Fly.io)
- [ ] Set up environment/secrets management (DB URL, Claude API key, email provider keys)
- [ ] Set up production database + run migrations
- [ ] Basic logging/monitoring for errors and API failures
- [ ] Smoke test the full flow: inbound email → ticket → AI suggestions → agent reply → outbound email

## Notes

- Phases are roughly sequential; Phase 5 (AI) and Phase 6 (Email) could be
  parallelized once Phase 4's data model is stable.
- Items marked ⚠️ correspond to open questions in `project-scope.md` and should
  be resolved before starting that phase, not worked around with assumptions.
