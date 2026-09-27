import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { NavBar } from '../components/NavBar'
import { TicketsTable, type TicketListItem } from '../components/TicketsTable'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function Tickets() {
  const {
    data: tickets,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const response = await axios.get<{ tickets: TicketListItem[] }>('/api/tickets', {
        withCredentials: true,
      })
      return response.data.tickets
    },
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

          {!isError && <TicketsTable tickets={tickets} isPending={isPending} />}
        </div>
      </main>
    </div>
  )
}
