import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { UserRole } from './generated/prisma/client.ts'
import { prisma } from './db.ts'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    disableSignUp: true,
  },
  trustedOrigins: ['http://localhost:5173'],
  user: {
    additionalFields: {
      role: {
        type: [UserRole.ADMIN, UserRole.AGENT] as const,
        required: false,
        defaultValue: UserRole.AGENT,
        input: false,
      },
    },
  },
})
