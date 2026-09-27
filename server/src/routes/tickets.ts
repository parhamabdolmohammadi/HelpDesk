import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '../generated/prisma/client.ts'
import { prisma } from '../db.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { requireInboundEmailSecret } from '../middleware/requireInboundEmailSecret.ts'

export const ticketsRouter = Router()

const listTicketsQuerySchema = z.object({
  sortBy: z.enum(['subject', 'requesterEmail', 'status', 'category', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['OPEN', 'RESOLVED', 'CLOSED']).optional(),
  // 'UNCLASSIFIED' is a UI-facing stand-in for category: null (there's no
  // such enum value in the schema), since a ticket created from an inbound
  // email is left uncategorized until a human or future AI step sets one.
  category: z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST', 'UNCLASSIFIED']).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
})

// requireAuth only, no requireRole — any logged-in user (AGENT or ADMIN)
// can view the ticket list, unlike usersRouter which is admin-only.
// Sorting, filtering, and pagination all happen here, in the Prisma
// query, not client-side — sortBy/status/category are checked against
// enums above (not raw user input) before they ever reach
// `where`/`orderBy`, so they can't be used to inject an arbitrary column
// or condition.
ticketsRouter.get('/', requireAuth, async (req, res) => {
  const parsed = listTicketsQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { sortBy, sortOrder, status, category, search, page, pageSize } = parsed.data

  const where: Prisma.TicketWhereInput = {
    ...(status && { status }),
    ...(category && { category: category === 'UNCLASSIFIED' ? null : category }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: 'insensitive' } },
        { requesterEmail: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [tickets, totalCount] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        subject: true,
        requesterEmail: true,
        status: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.ticket.count({ where }),
  ])

  res.json({ tickets, totalCount })
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
