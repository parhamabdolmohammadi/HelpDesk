import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { cn } from 'cn'
import { selectClassName } from './TicketsFilters'

type Agent = {
  id: string
  name: string | null
  email: string
}

type TicketAssigneeSelectProps = {
  ticketId: string
  assigneeId: string | null
  className?: string
  disabled?: boolean
}

export function TicketAssigneeSelect({ ticketId, assigneeId, className, disabled }: TicketAssigneeSelectProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await axios.get<{ agents: Agent[] }>('/api/tickets/agents', {
        withCredentials: true,
      })
      return response.data.agents
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (nextAssigneeId: string | null) => {
      await axios.patch(
        `/api/tickets/${ticketId}/assignee`,
        { assigneeId: nextAssigneeId },
        { withCredentials: true },
      )
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] })
    },
    onError: (err) => {
      setError(axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to assign ticket') : 'Failed to assign ticket')
    },
  })

  return (
    <div>
      <select
        className={cn(selectClassName, className)}
        value={assigneeId ?? ''}
        disabled={isPending || disabled}
        onChange={(e) => mutate(e.target.value || null)}
      >
        <option value="">Unassigned</option>
        {agents?.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name ?? agent.email}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
