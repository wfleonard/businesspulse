import fs from 'fs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'
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

/**
 * Strip `sslmode`/`channel_binding` from the connection URL. Newer pg treats
 * `sslmode=require` as `verify-full`, which fails against managed databases
 * (self-signed CA chain, IP-based connections). We enforce TLS via the explicit
 * `ssl` option instead, so the URL's sslmode must not fight it.
 */
export function sanitizeDbUrl(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('sslmode')
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch {
    return url
  }
}

/**
 * TLS policy, controlled by env (not the URL, which we sanitize):
 *  - DATABASE_SSL=disable        → no TLS (local Postgres)
 *  - DATABASE_CA_CERT_FILE=path  → verify-full: encrypted + CA-pinned (managed, prod)
 *  - otherwise                   → encrypted, CA not pinned (rejectUnauthorized:false)
 */
function sslConfig(): PoolConfig['ssl'] {
  if (process.env.DATABASE_SSL === 'disable') return false
  const caFile = process.env.DATABASE_CA_CERT_FILE
  if (caFile) {
    return { ca: fs.readFileSync(caFile, 'utf8'), rejectUnauthorized: true }
  }
  return { rejectUnauthorized: false }
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('Missing required environment variable: DATABASE_URL')
    }
    pool = new Pool({
      connectionString: sanitizeDbUrl(connectionString),
      ssl: sslConfig(),
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
