import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { cn } from 'cn'
import { selectClassName } from './TicketsFilters'
import type { TicketCategory } from './TicketsTable'

type TicketCategorySelectProps = {
  ticketId: string
  category: TicketCategory
  className?: string
}

export function TicketCategorySelect({ ticketId, category, className }: TicketCategorySelectProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: async (nextCategory: TicketCategory) => {
      await axios.patch(`/api/tickets/${ticketId}`, { category: nextCategory }, { withCredentials: true })
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] })
    },
    onError: (err) => {
      setError(
        axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to update category') : 'Failed to update category',
      )
    },
  })

  return (
    <div>
      <select
        className={cn(selectClassName, className)}
        value={category ?? ''}
        disabled={isPending}
        onChange={(e) => mutate(e.target.value === '' ? null : (e.target.value as NonNullable<TicketCategory>))}
      >
        <option value="">Unclassified</option>
        <option value="GENERAL_QUESTION">General Question</option>
        <option value="TECHNICAL_QUESTION">Technical Question</option>
        <option value="REFUND_REQUEST">Refund Request</option>
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
