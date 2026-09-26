import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { hashPassword } from 'better-auth/crypto'
import { createUserSchema, updateUserSchema } from 'core'
import { UserRole } from '../generated/prisma/client.ts'
import { prisma } from '../db.ts'
import { requireAuth } from '../middleware/requireAuth.ts'
import { requireRole } from '../middleware/requireRole.ts'

export const usersRouter = Router()

usersRouter.use(requireAuth, requireRole('ADMIN'))

usersRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ users })
})

usersRouter.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { name, email, password } = parsed.data

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, role: UserRole.AGENT, emailVerified: true },
    })

    await tx.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: await hashPassword(password),
      },
    })

    return user
  })

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  })
})

usersRouter.patch('/:id', async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: parsed.error.issues[0].message })
    return
  }

  const { name, email, password } = parsed.data

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: req.params.id },
      data: { name, email },
    })

    if (password) {
      await tx.account.updateMany({
        where: { userId: user.id, providerId: 'credential' },
        data: { password: await hashPassword(password) },
      })
    }

    return user
  })

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  })
})
