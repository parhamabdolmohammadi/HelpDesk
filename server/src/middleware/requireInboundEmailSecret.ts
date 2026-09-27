import { timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export function requireInboundEmailSecret(req: Request, res: Response, next: NextFunction) {
  const configuredSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET

  if (!configuredSecret) {
    console.error('INBOUND_EMAIL_WEBHOOK_SECRET is not configured')
    res.status(500).json({ status: 'error', message: 'Internal server error' })
    return
  }

  const providedSecret = req.header('x-webhook-secret')

  if (!providedSecret) {
    res.status(401).json({ status: 'error', message: 'Unauthorized' })
    return
  }

  const expected = Buffer.from(configuredSecret)
  const provided = Buffer.from(providedSecret)

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    res.status(401).json({ status: 'error', message: 'Unauthorized' })
    return
  }

  next()
}
