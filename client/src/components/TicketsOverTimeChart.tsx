import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type TicketsOverTimeChartProps = {
  dailyTicketCounts: { date: string; count: number }[]
}

function formatTickLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TicketsOverTimeChart({ dailyTicketCounts }: TicketsOverTimeChartProps) {
  const data = dailyTicketCounts.map((d) => ({ ...d, label: formatTickLabel(d.date) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Tickets Over the Past 30 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              interval={Math.ceil(data.length / 10)}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={(_, payload) => payload[0]?.payload.label} />
            <Bar dataKey="count" name="Tickets" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
