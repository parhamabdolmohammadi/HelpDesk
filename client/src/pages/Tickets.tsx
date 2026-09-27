import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import axios from 'axios'
import { useState } from 'react'
import { NavBar } from '../components/NavBar'
import { TicketsTable, type TicketListItem } from '../components/TicketsTable'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  const sortBy = sorting[0]?.id ?? 'createdAt'
  const sortOrder = sorting[0]?.desc ? 'desc' : 'asc'

  const {
    data: tickets,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tickets', sortBy, sortOrder],
    queryFn: async () => {
      const response = await axios.get<{ tickets: TicketListItem[] }>('/api/tickets', {
        params: { sortBy, sortOrder },
        withCredentials: true,
      })
      return response.data.tickets
    },
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <NavBar />
      <main className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Tickets</h1>

        <div className="mt-4">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to load tickets</AlertDescription>
            </Alert>
          )}

          {!isError && (
            <TicketsTable tickets={tickets} isPending={isPending} sorting={sorting} onSortingChange={setSorting} />
          )}
        </div>
      </main>
    </div>
  )
}
