import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { requireInboundEmailSecret } from '../middleware/requireInboundEmailSecret.ts'

export const ticketsRouter = Router()

const listTicketsQuerySchema = z.object({
  sortBy: z.enum(['subject', 'requesterEmail', 'status', 'category', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// requireAuth only, no requireRole — any logged-in user (AGENT or ADMIN)
// can view the ticket list, unlike usersRouter which is admin-only.
// Sorting happens here, in the Prisma query, not client-side — sortBy is
// checked against the enum above (not raw user input) before it ever
// reaches `orderBy`, so it can't be used to inject an arbitrary column.
ticketsRouter.get('/', requireAuth, async (req, res) => {
  const parsed = listTicketsQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { sortBy, sortOrder } = parsed.data

  const tickets = await prisma.ticket.findMany({
    orderBy: { [sortBy]: sortOrder },
    select: {
      id: true,
      subject: true,
      requesterEmail: true,
      status: true,
      category: true,
      createdAt: true,
    },
  })

  res.json({ tickets })
})

const inboundEmailSchema = z.object({
  from: z.string().trim().min(1, 'From is required').email('From must be a valid email'),
  senderName: z.string().trim().min(1, 'Sender name is required'),
  subject: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : '(no subject)')),
  text: z.string().trim().min(1, 'Text is required'),
})

// Strips leading Re:/Fwd: reply/forward prefixes (repeated, case-insensitive)
// and case/whitespace differences, so "Re: Login broken" matches the
// original "Login broken" thread instead of starting a new ticket.
function normalizeSubject(subject: string): string {
  let normalized = subject.trim()

  while (/^(re|fwd|fw)\s*:\s*/i.test(normalized)) {
    normalized = normalized.replace(/^(re|fwd|fw)\s*:\s*/i, '').trim()
  }

  return normalized.toLowerCase()
}

// Unlike usersRouter, this router has no whole-router requireAuth guard —
// /inbound-email is called by an external system with no user session.
// Future CRUD routes added here must apply requireAuth/requireRole
// per-route, not via ticketsRouter.use(...), or this webhook would start
// requiring a login session too.
ticketsRouter.post('/inbound-email', requireInboundEmailSecret, async (req, res) => {
  const parsed = inboundEmailSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { from, senderName, subject, text } = parsed.data

  // Same sender + same subject (ignoring Re:/Fwd: and case) on a ticket
  // that's still OPEN is treated as a continuation of that conversation,
  // not a new one. A RESOLVED/CLOSED ticket is left alone — a new email
  // for that subject starts a fresh ticket rather than silently reopening
  // a closed conversation.
  const openTicketsFromSender = await prisma.ticket.findMany({
    where: { requesterEmail: { equals: from, mode: 'insensitive' }, status: 'OPEN' },
  })

  const existingTicket = openTicketsFromSender.find(
    (candidate) => normalizeSubject(candidate.subject) === normalizeSubject(subject),
  )

  if (existingTicket) {
    await prisma.ticket.update({
      where: { id: existingTicket.id },
      data: { messages: { create: { fromEmail: from, senderName, body: text } } },
    })

    res.status(201).json({ ticket: { id: existingTicket.id }, appendedToExistingTicket: true })
    return
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      requesterEmail: from,
      messages: { create: { fromEmail: from, senderName, body: text } },
    },
  })

  res.status(201).json({ ticket: { id: ticket.id }, appendedToExistingTicket: false })
})
