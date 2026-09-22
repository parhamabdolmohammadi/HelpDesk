import express from 'express'
import { prisma } from './db.ts'

const app = express()
const port = process.env.PORT ?? 4000

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health/db', async (_req, res) => {
  try {
    const ticketCount = await prisma.ticket.count()
    res.json({ status: 'ok', ticketCount })
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message })
  }
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
