import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { Prisma } from './generated/prisma/client.ts'
import { prisma } from './db.ts'
import { auth } from './auth.ts'
import { requireAuth } from './middleware/requireAuth.ts'
import { usersRouter } from './routes/users.ts'
import { ticketsRouter } from './routes/tickets.ts'
import { trustedOrigins } from './trustedOrigins.ts'
import { boss } from './queue.ts'
import { registerClassifyTicketWorker } from './jobs/classifyTicket.ts'
import { registerAutoResolveTicketWorker } from './jobs/autoResolveTicket.ts'

const app = express()
const port = process.env.PORT ?? 4000

app.use(helmet() as unknown as express.RequestHandler)
app.use(cors({ origin: trustedOrigins, credentials: true }))

if (process.env.NODE_ENV === 'production') {
  const signInLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  })

  app.use('/api/auth/sign-in/email', signInLimiter)
}

app.all('/api/auth/*splat', toNodeHandler(auth) as unknown as express.RequestHandler)

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health/db', async (_req, res) => {
  const ticketCount = await prisma.ticket.count()
  res.json({ status: 'ok', ticketCount })
})

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

app.use('/api/users', usersRouter)
app.use('/api/tickets', ticketsRouter)

// In production this server also serves the built client (see the root
// Dockerfile, which runs `bun run build` in client/ before starting this
// process) — same-origin, so there's no cross-origin cookie/CORS concern
// for the session cookie in production. In development the two run as
// separate processes instead (Vite's dev server on 5173, proxying /api to
// this server on 4000 — see client/vite.config.ts), so this block is
// skipped entirely.
if (process.env.NODE_ENV === 'production') {
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url))

  app.use(express.static(clientDist))

  // SPA fallback for client-side routing (e.g. a hard refresh on
  // /tickets/:id) — but only for non-API paths, so a typo'd or removed API
  // route still 404s as JSON instead of silently serving the SPA shell.
  app.get('*splat', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ status: 'error', message: 'Not found' })
      return
    }

    res.sendFile(join(clientDist, 'index.html'))
  })
}

// Express 5 forwards a rejected promise from any route/middleware above to
// this error handler automatically, so routes don't need their own
// try/catch just to translate an error into a response.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ status: 'error', message: 'A user with this email already exists' })
      return
    }

    if (err.code === 'P2025') {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }
  }

  console.error(err)
  res.status(500).json({ status: 'error', message: 'Internal server error' })
})

await boss.start()
await registerClassifyTicketWorker()
await registerAutoResolveTicketWorker()

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
