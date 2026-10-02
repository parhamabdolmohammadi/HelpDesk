import { readFile } from 'node:fs/promises'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { boss } from '../queue.ts'
import { prisma } from '../db.ts'

export const AUTO_RESOLVE_TICKET_QUEUE = 'auto-resolve-ticket'

type AutoResolveTicketJob = { ticketId: string; text: string; senderName: string }

// Re-read on every job run (rather than cached at module load) so an edit to
// knowledge-base.md takes effect without restarting the server.
async function loadKnowledgeBase(): Promise<string> {
  return readFile(new URL('../../knowledge-base.md', import.meta.url), 'utf-8')
}

// Called from the inbound-email route to enqueue auto-resolution without
// blocking the webhook's response on it, same as enqueueClassifyTicket.
export async function enqueueAutoResolveTicket(
  ticketId: string,
  text: string,
  senderName: string,
): Promise<void> {
  await boss.send(AUTO_RESOLVE_TICKET_QUEUE, { ticketId, text, senderName } satisfies AutoResolveTicketJob)
}

// Registered once at server startup (see index.ts). Resolves a ticket only
// when the model is confident the knowledge base answers it outright; any of
// the knowledge base's own escalation rules (legal threats, refund requests
// outside the 30-day window, chargebacks/disputes, account security
// concerns, or low confidence) must leave the ticket OPEN for a human agent
// instead.
export async function registerAutoResolveTicketWorker(): Promise<void> {
  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE)

  await boss.work<AutoResolveTicketJob>(AUTO_RESOLVE_TICKET_QUEUE, async ([job]) => {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured — skipping ticket auto-resolution')
      return
    }

    const { ticketId, text, senderName } = job.data
    const knowledgeBase = await loadKnowledgeBase()
    const customerFirstName = senderName.split(' ')[0]

    const { object } = await generateObject({
      model: openai('gpt-5-nano'),
      schema: z.object({
        canAutoResolve: z.boolean(),
        reply: z.string(),
        reason: z.string(),
      }),
      system:
        'You are a tier-1 customer support assistant. You decide whether a ' +
        "new support ticket can be fully answered from the knowledge base " +
        'below, well enough to resolve it without a human agent.\n\n' +
        'Knowledge base:\n' +
        `${knowledgeBase}\n\n` +
        'Set canAutoResolve to true only if the knowledge base directly and ' +
        "confidently answers the customer's message and none of the " +
        "knowledge base's own escalation rules apply (legal threats, a " +
        "refund request outside the 30-day window, a disputed charge or " +
        "chargeback, account security concerns, or low confidence). If " +
        "any of those apply, or the message is ambiguous, off-topic, or " +
        "not covered by the knowledge base, set canAutoResolve to false " +
        'and leave it for a human agent.\n\n' +
        "When canAutoResolve is true, write the customer-facing answer in " +
        "`reply`, using only information from the knowledge base — don't " +
        `invent policies or details. Open with a brief, warm greeting ` +
        `addressing the customer by their first name, ${customerFirstName}. ` +
        'Keep a professional, customer-friendly tone throughout — empathetic ' +
        'and polite, never terse or robotic. Format the reply clearly: short ' +
        'paragraphs, and when there are multiple steps or reasons, a simple ' +
        "dashed list like the knowledge base uses, instead of one dense " +
        "block of text. Don't include a sign-off naming anyone — one is " +
        'appended separately. When canAutoResolve is false, `reply` can be ' +
        'empty. Always fill in `reason` with a brief internal note on why ' +
        'you did or did not resolve it — this is not shown to the customer.',
      prompt: text,
    })

    if (!object.canAutoResolve) {
      console.log(`Ticket ${ticketId} left for a human agent: ${object.reason}`)
      return
    }

    await prisma.$transaction([
      prisma.ticketReply.create({
        data: {
          ticketId,
          isAiGenerated: true,
          body: `${object.reply}\n\nBest regards,\nParham Abdo Support`,
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'RESOLVED', autoResolved: true },
      }),
    ])
  })
}
