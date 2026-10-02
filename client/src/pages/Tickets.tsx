import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { NavBar } from '../components/NavBar'
import { TicketsFilters } from '../components/TicketsFilters'
import { TicketsTable, type TicketListItem } from '../components/TicketsTable'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
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

  // Changing sort/filters can leave the current page out of range for the
  // new result set, so jump back to page 1 whenever any of them change.
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [sortBy, sortOrder, status, category, search])

  const {
    data,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tickets', sortBy, sortOrder, status, category, search, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const response = await axios.get<{ tickets: TicketListItem[]; totalCount: number }>('/api/tickets', {
        params: {
          sortBy,
          sortOrder,
          status: status || undefined,
          category: category || undefined,
          search: search || undefined,
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
        },
        withCredentials: true,
      })
      return response.data
    },
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <NavBar />
      <main className="p-6">
        <h1 className="font-heading text-2xl text-foreground">Tickets</h1>

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
            <TicketsTable
              tickets={data?.tickets}
              isPending={isPending}
              sorting={sorting}
              onSortingChange={setSorting}
              pagination={pagination}
              onPaginationChange={setPagination}
              rowCount={data?.totalCount ?? 0}
            />
          )}
        </div>
      </main>
    </div>
  )
}
