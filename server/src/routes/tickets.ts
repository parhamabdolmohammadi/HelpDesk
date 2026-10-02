import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createTicketReplySchema, createTicketSchema } from 'core'
import { UserRole, type Prisma } from '../generated/prisma/client.ts'
import { prisma } from '../db.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { requireInboundEmailSecret } from '../middleware/requireInboundEmailSecret.ts'
import { enqueueClassifyTicket } from '../jobs/classifyTicket.ts'
import { enqueueAutoResolveTicket } from '../jobs/autoResolveTicket.ts'

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

// requireAuth only, matching the other ticket routes — any logged-in user
// can submit a ticket, not just admins. The requester is always the
// authenticated user (req.user, never the request body) — same reasoning
// as a reply's author always coming from the session. Goes through the
// same classify/auto-resolve pipeline as an inbound email, since from the
// ticket's perspective it's just another way a ticket comes into existence.
ticketsRouter.post('/', requireAuth, async (req, res) => {
  const parsed = createTicketSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { subject, body } = parsed.data
  const requesterName = req.user!.name ?? req.user!.email
  const requesterEmail = req.user!.email

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      requesterEmail,
      messages: { create: { fromEmail: requesterEmail, senderName: requesterName, body } },
    },
  })

  await enqueueClassifyTicket(ticket.id, body)
  await enqueueAutoResolveTicket(ticket.id, body, requesterName)

  res.status(201).json({ ticket })
})

const polishDescriptionSchema = z.object({ body: z.string().trim().min(1, 'Description cannot be empty') })

// requireAuth only, matching the other ticket routes — any logged-in user
// drafting a ticket can polish its description before submitting. Never
// persists anything itself, same as the reply-polish endpoint.
ticketsRouter.post('/polish-description', requireAuth, async (req, res) => {
  const parsed = polishDescriptionSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured')
    res.status(500).json({ status: 'error', message: 'AI polishing is not configured' })
    return
  }

  const { text } = await generateText({
    model: openai('gpt-5-nano'),
    system:
      'You polish draft support ticket descriptions written by the person ' +
      'submitting the ticket. Improve grammar, clarity, and tone while ' +
      "preserving the description's meaning and facts exactly — don't add " +
      "new claims, promises, or information. Respond with only the " +
      'improved description text, no preamble or commentary.',
    prompt: parsed.data.body,
  })

  res.json({ polished: text })
})

const generateSubjectSchema = z.object({ body: z.string().trim().min(1, 'Description cannot be empty') })

// requireAuth only, matching the other ticket routes — lets a user generate
// a subject line from the description they've already written, instead of
// writing one themselves. Never persists anything itself.
ticketsRouter.post('/generate-subject', requireAuth, async (req, res) => {
  const parsed = generateSubjectSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured')
    res.status(500).json({ status: 'error', message: 'AI generation is not configured' })
    return
  }

  const { text } = await generateText({
    model: openai('gpt-5-nano'),
    system:
      "You write short, clear support ticket subject lines from a " +
      "customer's description of their issue. Summarize the core issue " +
      'in a few words — specific and professional, never generic like ' +
      '"Help" or "Question". Respond with only the subject line, no ' +
      'quotes, no preamble or commentary.',
    prompt: parsed.data.body,
  })

  res.json({ subject: text })
})

// Declared before GET /:id so 'mine' isn't captured as an :id value,
// matching GET /agents below. Lists only the logged-in user's own
// submitted tickets — just enough to identify and open one, not the
// AI/agent response, which lives on the ticket detail page instead.
ticketsRouter.get('/mine', requireAuth, async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { requesterEmail: req.user!.email },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      createdAt: true,
    },
  })

  res.json({ tickets })
})

// Declared before GET /:id so 'agents' isn't captured as an :id value.
// requireAuth only — any logged-in user needs this list to populate the
// assignee dropdown, not just admins (unlike usersRouter's admin-only
// user list).
ticketsRouter.get('/agents', requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: UserRole.AGENT, deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  res.json({ agents })
})

const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// The dashboard's bar chart covers a 30-day window that normally ends today.
// But in a quiet period — no ticket created in the last 10 days — ending at
// today would mostly show empty days with no data at all, so the window
// instead ends on the most recent ticket's date, covering the 30 days
// leading up to the last real activity.
function resolveChartWindow(lastTicketCreatedAt: Date | null): { start: Date; end: Date } {
  const now = new Date()
  const tenDaysAgo = new Date(now.getTime() - 10 * DAY_MS)

  const endAnchor = lastTicketCreatedAt && lastTicketCreatedAt < tenDaysAgo ? lastTicketCreatedAt : now

  const end = new Date(
    Date.UTC(endAnchor.getUTCFullYear(), endAnchor.getUTCMonth(), endAnchor.getUTCDate(), 23, 59, 59, 999),
  )
  const start = new Date(end.getTime() - 29 * DAY_MS)
  const rangeStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))

  return { start: rangeStart, end }
}

// Declared before GET /:id so 'stats' isn't captured as an :id value,
// matching GET /agents above. Backs the dashboard page.
ticketsRouter.get('/stats', requireAuth, async (_req, res) => {
  const lastTicket = await prisma.ticket.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
  const { start, end } = resolveChartWindow(lastTicket?.createdAt ?? null)

  const [totalTickets, openTickets, autoResolvedTickets, resolvedTickets, ticketsInWindow] = await prisma.$transaction([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { autoResolved: true } }),
    // Only resolvedAt is needed to compute resolution time — not the whole
    // row — since the average is calculated here rather than in SQL.
    prisma.ticket.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
  ])

  const averageResolutionMs =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) /
        resolvedTickets.length
      : null

  const countsByDate = new Map<string, number>()
  for (const ticket of ticketsInWindow) {
    const key = dateKey(ticket.createdAt)
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1)
  }

  const dailyTicketCounts = Array.from({ length: 30 }, (_, i) => {
    const date = dateKey(new Date(start.getTime() + i * DAY_MS))
    return { date, count: countsByDate.get(date) ?? 0 }
  })

  res.json({
    totalTickets,
    openTickets,
    autoResolvedTickets,
    percentAutoResolved: totalTickets > 0 ? (autoResolvedTickets / totalTickets) * 100 : 0,
    averageResolutionMs,
    dailyTicketCounts,
  })
})

// requireAuth only, matching GET / above — any logged-in user can view a
// ticket's details, not just admins.
ticketsRouter.get('/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
  })

  if (!ticket) {
    res.status(404).json({ status: 'error', message: 'Ticket not found' })
    return
  }

  res.json({ ticket })
})

const updateTicketSchema = z
  .object({
    status: z.enum(['OPEN', 'RESOLVED', 'CLOSED']).optional(),
    // null clears the category (the "Unclassified" state); omitting the
    // field entirely leaves the current category untouched.
    category: z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST']).nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.category !== undefined, {
    message: 'At least one of status or category must be provided',
  })

// requireAuth only, matching the other ticket routes — any logged-in user
// can update a ticket's status/category, not just admins. Only the fields
// present in the request body are changed, so a client that only wants to
// change status doesn't need to resend category (and vice versa).
ticketsRouter.patch('/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = updateTicketSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { status, category } = parsed.data

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } })

  if (!ticket) {
    res.status(404).json({ status: 'error', message: 'Ticket not found' })
    return
  }

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      // resolvedAt tracks exactly when status became RESOLVED (for the
      // dashboard's average resolution time) — set on the way in, cleared
      // if the ticket is moved to a different status afterward, since
      // updatedAt alone can't distinguish "just resolved" from any other
      // later edit (assignee, category, a new reply).
      ...(status !== undefined && { status, resolvedAt: status === 'RESOLVED' ? new Date() : null }),
      ...(category !== undefined && { category }),
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  })

  res.json({ ticket: updated })
})

const assignTicketSchema = z.object({
  // null unassigns the ticket; omitting the field entirely is not allowed,
  // to keep the intent of the request explicit.
  assigneeId: z.string().min(1).nullable(),
})

// requireAuth only, matching the other ticket routes — any logged-in user
// can assign a ticket, not just admins. Only AGENT-role users can be
// assignees (see GET /agents above), so this re-validates assigneeId
// against the same role/deletedAt condition rather than trusting the id
// the client sent.
ticketsRouter.patch('/:id/assignee', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = assignTicketSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { assigneeId } = parsed.data

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })

    if (!assignee || assignee.deletedAt || assignee.role !== UserRole.AGENT) {
      res.status(400).json({ status: 'error', message: 'Assignee not found' })
      return
    }
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } })

  if (!ticket) {
    res.status(404).json({ status: 'error', message: 'Ticket not found' })
    return
  }

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { assigneeId },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  })

  res.json({ ticket: updated })
})

// requireAuth only, matching the other ticket routes — any logged-in user
// (AGENT or ADMIN) can reply to a ticket. The reply's author is always the
// logged-in user, never taken from the request body.
ticketsRouter.post('/:id/replies', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = createTicketReplySchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } })

  if (!ticket) {
    res.status(404).json({ status: 'error', message: 'Ticket not found' })
    return
  }

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId: ticket.id,
      authorId: req.user!.id,
      // Better Auth types this additional field as optional (its own schema
      // marks it `required: false`), even though the DB column always has a
      // value — fall back to the same AGENT default it configures.
      senderType: req.user!.role ?? UserRole.AGENT,
      body: parsed.data.body,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  })

  res.status(201).json({ reply })
})

// requireAuth only, matching POST /:id/replies — any logged-in user drafting
// a reply can polish it before sending. Reuses createTicketReplySchema since
// the request shape (a single non-empty `body` string) is identical to
// creating a reply; this endpoint never persists anything itself.
ticketsRouter.post('/:id/replies/polish', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const parsed = createTicketReplySchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  // The first message is the original inbound email, so its senderName is
  // the requester's display name — same lookup the client does to show
  // "From" on the ticket detail page.
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
  })

  if (!ticket) {
    res.status(404).json({ status: 'error', message: 'Ticket not found' })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured')
    res.status(500).json({ status: 'error', message: 'AI polishing is not configured' })
    return
  }

  const customerFirstName = ticket.messages[0]?.senderName.split(' ')[0]

  const { text } = await generateText({
    model: openai('gpt-5-nano'),
    system:
      'You polish draft replies written by customer support agents. Improve ' +
      "grammar, clarity, and tone while preserving the reply's meaning and " +
      "facts exactly — don't add new claims, promises, or information. " +
      (customerFirstName
        ? `Open with a brief greeting addressing the customer by their first name, ${customerFirstName}. `
        : '') +
      "Don't add a sign-off naming the agent — one is appended separately. " +
      'Respond with only the improved reply text, no preamble or commentary.',
    prompt: parsed.data.body,
  })

  // The signature always comes from the authenticated agent's own session,
  // never from the model output, so a reply can't be signed with a name/email
  // the model made up or that another user supplied.
  const signature = `Best regards,\n${req.user!.name ?? req.user!.email}\n${req.user!.email}`

  res.json({ polished: `${text}\n\n${signature}` })
})

// requireAuth only, matching the other ticket routes. Nothing is persisted —
// the summary is regenerated from the current messages/replies on every
// call, so re-clicking "Summarize" after new activity always reflects the
// latest thread instead of serving a stale cached result.
ticketsRouter.post('/:id/summarize', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { name: true, email: true } } },
      },
    },
  })

  if (!ticket) {
    res.status(404).json({ status: 'error', message: 'Ticket not found' })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured')
    res.status(500).json({ status: 'error', message: 'AI summarization is not configured' })
    return
  }

  const thread = [
    ...ticket.messages.map((message) => ({ from: message.senderName, body: message.body, at: message.createdAt })),
    ...ticket.replies.map((reply) => ({
      from: reply.isAiGenerated ? 'Support Team (AI)' : reply.author!.name ?? reply.author!.email,
      body: reply.body,
      at: reply.createdAt,
    })),
  ]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((entry) => `${entry.from}:\n${entry.body}`)
    .join('\n\n---\n\n')

  const { text } = await generateText({
    model: openai('gpt-5-nano'),
    system:
      'You summarize customer support ticket threads for agents. Write a ' +
      "concise summary (2-4 sentences) covering the customer's issue, any " +
      "key details (e.g. order/account info), and the current status based " +
      "on the latest message. Only use information present in the thread " +
      "— don't invent details. Respond with only the summary text, no " +
      'preamble or commentary.',
    prompt: thread,
  })

  res.json({ summary: text })
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

  // Enqueuing is just a fast insert — classification and auto-resolution
  // themselves run later in their pg-boss workers (see jobs/classifyTicket.ts
  // and jobs/autoResolveTicket.ts), so the webhook caller isn't kept waiting
  // on either AI call. Only fires for a brand-new ticket, not a message
  // appended to an existing open one.
  await enqueueClassifyTicket(ticket.id, text)
  await enqueueAutoResolveTicket(ticket.id, text, senderName)

  res.status(201).json({ ticket: { id: ticket.id }, appendedToExistingTicket: false })
})
