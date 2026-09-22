import type { NextFunction, Request, Response } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../auth.ts'

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

declare global {
  namespace Express {
    interface Request {
      user?: AuthSession['user']
      session?: AuthSession['session']
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })

  if (!result) {
    res.status(401).json({ status: 'error', message: 'Unauthorized' })
    return
  }

  req.user = result.user
  req.session = result.session
  next()
}
