import { z } from 'zod'

// No requesterName/requesterEmail here — the requester is always the
// authenticated user submitting the ticket. The server derives both from
// the session (see POST / in routes/tickets.ts) rather than trusting
// client-supplied values, the same way a ticket reply's author always comes
// from the session instead of the request body.
export const createTicketSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  body: z.string().trim().min(1, 'Please describe the issue'),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
