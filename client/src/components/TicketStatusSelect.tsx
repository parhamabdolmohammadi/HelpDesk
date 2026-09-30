import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { cn } from 'cn'
import { selectClassName } from './TicketsFilters'
import type { TicketStatus } from './TicketsTable'

type TicketStatusSelectProps = {
  ticketId: string
  status: TicketStatus
  className?: string
}

export function TicketStatusSelect({ ticketId, status, className }: TicketStatusSelectProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: async (nextStatus: TicketStatus) => {
      await axios.patch(`/api/tickets/${ticketId}`, { status: nextStatus }, { withCredentials: true })
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] })
    },
    onError: (err) => {
      setError(
        axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to update status') : 'Failed to update status',
      )
    },
  })

  return (
    <div>
      <select
        className={cn(selectClassName, className)}
        value={status}
        disabled={isPending}
        onChange={(e) => mutate(e.target.value as TicketStatus)}
      >
        <option value="OPEN">Open</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
