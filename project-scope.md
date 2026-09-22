# AI-Powered Ticket Management System

## Problem

We receive hundreds of support emails daily. Our agents manually
read, classify, and respond to each ticket — which is slow and
leads to impersonal, canned responses.

## Solution

Build a ticket management system that uses AI to automatically
classify, respond to, and route support tickets — delivering
faster, more personalized responses to students while freeing up
agents for complex issues.

## Features

- Receive support emails and create tickets
- Auto-generate human-friendly responses using a knowledge base
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- User management (admin only)
- Dashboard to view and manage all tickets

## Ticket Statuses

- Open
- Resolved
- Closed

## Ticket Categories

Each ticket belongs to a single category:

- General question
- Technical question
- Refund request

## Admin

- The system is deployed with an admin role.
- The admin can create additional pages.

## Open Questions

- Is this system for an educational institution (students), or is "refund request"
  a sign the audience is broader (e.g. customers of a paid product)? Affects
  compliance requirements (e.g. FERPA) and terminology.
- No "in progress" status is defined — is that intentional, or is there a need
  to distinguish "unclaimed" vs. "someone is actively working this" tickets?
- What does "the admin can create additional pages" mean specifically:
  new ticket categories, new views/dashboards in the app, new user accounts,
  or something else?
- Are AI-suggested replies auto-sent, or does an agent always review/approve
  before sending?
- Where does the knowledge base come from (existing docs to ingest, or built
  from scratch)?
- What email system is used for ticket intake (Gmail, Outlook, shared inbox,
  existing helpdesk API)?
- Expected ticket volume/scale, and any SLA or priority requirements per category.