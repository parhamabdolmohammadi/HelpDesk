import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Clock, Percent, Sparkles, Ticket, TicketCheck } from 'lucide-react'
import { NavBar } from '../components/NavBar'
import { TicketsOverTimeChart } from '../components/TicketsOverTimeChart'
import { useSession } from '../lib/auth-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type TicketStats = {
  totalTickets: number
  openTickets: number
  autoResolvedTickets: number
  percentAutoResolved: number
  averageResolutionMs: number | null
  dailyTicketCounts: { date: string; count: number }[]
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'

  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return `${hours}h ${remainingMinutes}m`

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

type StatCardProps = {
  title: string
  value: string
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

export function Home() {
  const { data: session } = useSession()
  const displayName = session?.user.name || session?.user.email

  const { data, isPending, isError } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const response = await axios.get<TicketStats>('/api/tickets/stats', {
        withCredentials: true,
      })
      return response.data
    },
  })

  const iconClassName = 'h-4 w-4 text-muted-foreground'

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-xl font-semibold text-gray-900">Welcome back, {displayName}</h1>

        <div className="mt-6">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to load dashboard stats</AlertDescription>
            </Alert>
          )}

          {isPending && !isError && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          )}

          {!isPending && !isError && data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Total Tickets"
                value={data.totalTickets.toString()}
                icon={<Ticket className={iconClassName} />}
              />
              <StatCard
                title="Open Tickets"
                value={data.openTickets.toString()}
                icon={<TicketCheck className={iconClassName} />}
              />
              <StatCard
                title="Resolved by AI"
                value={data.autoResolvedTickets.toString()}
                icon={<Sparkles className={iconClassName} />}
              />
              <StatCard
                title="% Resolved by AI"
                value={`${data.percentAutoResolved.toFixed(1)}%`}
                icon={<Percent className={iconClassName} />}
              />
              <StatCard
                title="Average Resolution Time"
                value={formatDuration(data.averageResolutionMs)}
                icon={<Clock className={iconClassName} />}
              />
            </div>
          )}

          {isPending && !isError && <Skeleton className="mt-4 h-80 w-full" />}

          {!isPending && !isError && data && (
            <div className="mt-4">
              <TicketsOverTimeChart dailyTicketCounts={data.dailyTicketCounts} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
