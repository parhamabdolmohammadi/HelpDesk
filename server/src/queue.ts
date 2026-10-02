import { PgBoss } from 'pg-boss'

// Shares the same Postgres database as Prisma (DATABASE_URL) — pg-boss
// stores its queues/jobs in its own schema ("pgboss") there, so no separate
// broker (e.g. Redis) is needed.
export const boss = new PgBoss(process.env.DATABASE_URL!)

boss.on('error', (err) => console.error('pg-boss error:', err))
