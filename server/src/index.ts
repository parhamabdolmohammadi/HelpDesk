import express from 'express'
import { toNodeHandler } from 'better-auth/node'
import { prisma } from './db.ts'
import { auth } from './auth.ts'
import { requireAuth } from './middleware/requireAuth.ts'

const app = express()
const port = process.env.PORT ?? 4000

app.all('/api/auth/*splat', toNodeHandler(auth) as unknown as express.RequestHandler)

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

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user, session: req.session })
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
