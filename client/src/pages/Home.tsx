import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { MyTicketsList } from '../components/MyTicketsList'
import { NavBar } from '../components/NavBar'
import { SubmitTicketCard } from '../components/SubmitTicketCard'
import { TicketsOverTimeChart } from '../components/TicketsOverTimeChart'
import { useSession } from '../lib/auth-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

type StatProps = {
  label: string
  value: string
  // The muted-gold --ai-accent means exactly one thing everywhere it's
  // used in this app: the AI did this, not a human. Only the two
  // AI-attributed numbers carry it — every other stat stays neutral ink.
  aiAccent?: boolean
}

function Stat({ label, value, aiAccent }: StatProps) {
  return (
    <div className="flex-1 p-5">
      {/* min-h-10 reserves room for the longest label ("Average resolution
          time") to wrap onto two lines, so every value below lines up at
          the same height regardless of how long its own label is. */}
      <p className="min-h-10 text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl ${aiAccent ? 'text-ai-accent' : 'text-foreground'}`}>{value}</p>
    </div>
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

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="font-heading text-2xl text-foreground">Welcome back, {displayName}</h1>

        <div className="mt-6">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to load dashboard stats</AlertDescription>
            </Alert>
          )}

          {isPending && !isError && <Skeleton className="h-28 w-full" />}

          {!isPending && !isError && data && (
            <div className="flex flex-col divide-y divide-border rounded-md border border-border sm:flex-row sm:divide-x sm:divide-y-0">
              <Stat label="Total tickets" value={data.totalTickets.toString()} />
              <Stat label="Open tickets" value={data.openTickets.toString()} />
              <Stat label="Resolved by AI" value={data.autoResolvedTickets.toString()} aiAccent />
              <Stat label="% resolved by AI" value={`${data.percentAutoResolved.toFixed(1)}%`} aiAccent />
              <Stat label="Average resolution time" value={formatDuration(data.averageResolutionMs)} />
            </div>
          )}

          {isPending && !isError && <Skeleton className="mt-4 h-80 w-full" />}

          {!isPending && !isError && data && (
            <div className="mt-4">
              <TicketsOverTimeChart dailyTicketCounts={data.dailyTicketCounts} />
            </div>
          )}

          <div className="mt-4">
            <SubmitTicketCard />
          </div>

          <div className="mt-4">
            <MyTicketsList />
          </div>
        </div>
      </main>
    </div>
  )
}
