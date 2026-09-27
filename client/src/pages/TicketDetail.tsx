import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { NavBar } from '../components/NavBar'
import { TicketAssigneeSelect } from '../components/TicketAssigneeSelect'
import {
  formatCategory,
  statusStyles,
  type TicketCategory,
  type TicketStatus,
} from '../components/TicketsTable'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

type TicketMessage = {
  id: number
  fromEmail: string
  senderName: string
  body: string
  createdAt: string
}

type TicketDetail = {
  id: string
  subject: string
  requesterEmail: string
  status: TicketStatus
  category: TicketCategory
  assignee: { id: string; name: string | null; email: string } | null
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()

  const { data, isPending, isError } = useQuery({
    queryKey: ['tickets', id],
    queryFn: async () => {
      const response = await axios.get<{ ticket: TicketDetail }>(`/api/tickets/${id}`, {
        withCredentials: true,
      })
      return response.data.ticket
    },
  })

  // The Ticket model has no separate "requester name" field — the first
  // message is the original inbound email, so its senderName is the
  // requester's display name.
  const requesterName = data?.messages[0]?.senderName

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-3xl p-6">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>

        <div className="mt-4">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to load ticket</AlertDescription>
            </Alert>
          )}

          {isPending && !isError && (
            <div className="space-y-4">
              <Skeleton className="h-7 w-72" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {!isPending && !isError && data && (
            <>
              <h1 className="text-2xl font-bold text-gray-900">{data.subject}</h1>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[data.status]}`}
                >
                  {data.status}
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {formatCategory(data.category)}
                </span>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">From</dt>
                  <dd className="mt-0.5 text-foreground">
                    {requesterName ? `${requesterName} (${data.requesterEmail})` : data.requesterEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Assigned to</dt>
                  <dd className="mt-1">
                    <TicketAssigneeSelect ticketId={data.id} assigneeId={data.assignee?.id ?? null} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="mt-0.5 text-foreground">
                    {new Date(data.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="mt-0.5 text-foreground">
                    {new Date(data.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 space-y-4">
                {data.messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-foreground">Message</h2>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      From {message.senderName}
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">
                      {message.body}
                    </p>
                  </div>
                ))}

                {data.messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">No messages on this ticket.</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
