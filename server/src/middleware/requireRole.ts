import type { NextFunction, Request, Response } from 'express'
import { UserRole } from '../generated/prisma/client.ts'

export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      res.status(403).json({ status: 'error', message: 'Forbidden' })
      return
    }

    next()
  }
}
