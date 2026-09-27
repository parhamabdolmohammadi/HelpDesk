import { Skeleton } from '@/components/ui/skeleton'

export type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'
export type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST' | null

export type TicketListItem = {
  id: string
  subject: string
  requesterEmail: string
  status: TicketStatus
  category: TicketCategory
  createdAt: string
}

type TicketsTableProps = {
  tickets: TicketListItem[] | undefined
  isPending: boolean
}

const statusStyles: Record<TicketStatus, string> = {
  OPEN: 'bg-primary text-primary-foreground',
  RESOLVED: 'bg-muted text-muted-foreground',
  CLOSED: 'bg-muted text-muted-foreground',
}

function formatCategory(category: TicketCategory): string {
  if (!category) {
    return '—'
  }

  return category
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export function TicketsTable({ tickets, isPending }: TicketsTableProps) {
  if (isPending) {
    return (
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Subject</th>
              <th className="px-4 py-2 font-medium">Requester</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!tickets) {
    return null
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Subject</th>
            <th className="px-4 py-2 font-medium">Requester</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-t border-border">
              <td className="px-4 py-2">{ticket.subject}</td>
              <td className="px-4 py-2">{ticket.requesterEmail}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[ticket.status]}`}
                >
                  {ticket.status}
                </span>
              </td>
              <td className="px-4 py-2">{formatCategory(ticket.category)}</td>
              <td className="px-4 py-2">{new Date(ticket.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-muted-foreground" colSpan={5}>
                No tickets found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
