import { z } from 'zod'

export const createTicketReplySchema = z.object({
  body: z.string().trim().min(1, 'Reply cannot be empty'),
})

export type CreateTicketReplyInput = z.infer<typeof createTicketReplySchema>
