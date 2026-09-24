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
import { trustedOrigins } from './trustedOrigins.ts'

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

// Express 5 forwards a rejected promise from any route/middleware above to
// this error handler automatically, so routes don't need their own
// try/catch just to translate an error into a response.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ status: 'error', message: 'A user with this email already exists' })
    return
  }

  console.error(err)
  res.status(500).json({ status: 'error', message: 'Internal server error' })
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
