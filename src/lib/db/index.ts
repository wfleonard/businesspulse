import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { schema } from './schema'

/**
 * Lazy singleton pg pool + Drizzle client.
 *
 * The pool is created on first access, not at import, so `next build` and unit
 * tests don't require a live database. node-postgres does not open a connection
 * until the first query, so constructing the pool is cheap and side-effect-free.
 */

let pool: Pool | undefined
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('Missing required environment variable: DATABASE_URL')
    }
    pool = new Pool({
      connectionString,
      ssl:
        process.env.DATABASE_SSL === 'disable'
          ? false
          : { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    })
  }
  return pool
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema })
  }
  return dbInstance
}

/**
 * Proxy so callers can `import { db } from '@/lib/db'` and use it like a normal
 * Drizzle instance while the underlying pool is still created lazily.
 */
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>
    const value = real[prop]
    return typeof value === 'function' ? value.bind(real) : value
  },
})
