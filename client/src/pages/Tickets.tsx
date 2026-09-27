import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { NavBar } from '../components/NavBar'
import { TicketsFilters } from '../components/TicketsFilters'
import { TicketsTable, type TicketListItem } from '../components/TicketsTable'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Debounce the search box so we don't fire a request on every keystroke —
  // the committed `search` value (used in the query) only updates 300ms
  // after the user stops typing.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const sortBy = sorting[0]?.id ?? 'createdAt'
  const sortOrder = sorting[0]?.desc ? 'desc' : 'asc'

  const {
    data: tickets,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tickets', sortBy, sortOrder, status, category, search],
    queryFn: async () => {
      const response = await axios.get<{ tickets: TicketListItem[] }>('/api/tickets', {
        params: {
          sortBy,
          sortOrder,
          status: status || undefined,
          category: category || undefined,
          search: search || undefined,
        },
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
          <TicketsFilters
            status={status}
            category={category}
            searchInput={searchInput}
            onStatusChange={setStatus}
            onCategoryChange={setCategory}
            onSearchInputChange={setSearchInput}
          />
        </div>

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
