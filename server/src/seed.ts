import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { UserRole } from './generated/prisma/client.ts'
import { prisma } from './db.ts'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set')
}

// AGENT_EMAIL / AGENT_PASSWORD are optional and only expected to be set in
// server/.env.test, so this only seeds a non-admin user for the e2e test
// database (used by role-based-access specs) and stays a no-op for the
// production/dev seed, which has no such vars.
const agentEmail = process.env.AGENT_EMAIL
const agentPassword = process.env.AGENT_PASSWORD

async function seedUser(userEmail: string, userPassword: string, role: UserRole, name: string) {
  const existing = await prisma.user.findUnique({ where: { email: userEmail } })

  if (existing) {
    console.log(`User ${userEmail} already exists, skipping.`)
    return
  }

  const user = await prisma.user.create({
    data: {
      email: userEmail,
      name,
      role,
      emailVerified: true,
    },
  })

  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: await hashPassword(userPassword),
    },
  })

  console.log(`Created ${role} user ${userEmail}`)
}

await seedUser(email, password, UserRole.ADMIN, 'Admin')

if (agentEmail && agentPassword) {
  await seedUser(agentEmail, agentPassword, UserRole.AGENT, 'Agent')
} else {
  console.log('AGENT_EMAIL/AGENT_PASSWORD not set, skipping agent user seed.')
}

process.exit(0)
