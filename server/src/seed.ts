import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { UserRole } from './generated/prisma/client.ts'
import { prisma } from './db.ts'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set')
}

const existing = await prisma.user.findUnique({ where: { email } })

if (existing) {
  console.log(`Admin User ${email} already exists, skipping.`)
  process.exit(0)
}

const user = await prisma.user.create({
  data: {
    email,
    name: 'Admin',
    role: UserRole.ADMIN,
    emailVerified: true,
  },
})

await prisma.account.create({
  data: {
    id: randomUUID(),
    userId: user.id,
    accountId: user.id,
    providerId: 'credential',
    password: await hashPassword(password),
  },
})

console.log(`Created admin user ${email}`)
