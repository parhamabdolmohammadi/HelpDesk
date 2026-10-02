import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { boss } from '../queue.ts'
import { prisma } from '../db.ts'

export const CLASSIFY_TICKET_QUEUE = 'classify-ticket'

type ClassifyTicketJob = { ticketId: string; text: string }

// Called from the inbound-email route to enqueue classification without
// blocking the webhook's response on it — the job runs in the worker
// registered below, whenever pg-boss picks it up.
export async function enqueueClassifyTicket(ticketId: string, text: string): Promise<void> {
  await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId, text } satisfies ClassifyTicketJob)
}

// Registered once at server startup (see index.ts). Unlike the fire-and-forget
// version this replaced, a thrown error here fails the job and pg-boss
// retries it (its default retry policy) instead of silently dropping the
// classification on a transient OpenAI/DB error.
export async function registerClassifyTicketWorker(): Promise<void> {
  await boss.createQueue(CLASSIFY_TICKET_QUEUE)

  await boss.work<ClassifyTicketJob>(CLASSIFY_TICKET_QUEUE, async ([job]) => {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured — skipping ticket classification')
      return
    }

    const { ticketId, text } = job.data

    const { object } = await generateObject({
      model: openai('gpt-5-nano'),
      schema: z.object({
        category: z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST']),
      }),
      system:
        'You classify customer support tickets into exactly one category ' +
        'based on the content of the initial message:\n' +
        '- GENERAL_QUESTION: general questions about the product/service\n' +
        '- TECHNICAL_QUESTION: technical issues, bugs, or how-to questions\n' +
        '- REFUND_REQUEST: requests for a refund, cancellation, or billing dispute',
      prompt: text,
    })

    await prisma.ticket.update({ where: { id: ticketId }, data: { category: object.category } })
  })
}
