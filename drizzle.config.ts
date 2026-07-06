import type { Config } from 'drizzle-kit'
import { config as loadEnv } from 'dotenv'

// Load .env.local first (dev), then .env (fallback) for CLI tooling.
loadEnv({ path: '.env.local' })
loadEnv()

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/businesspulse',
    // TLS on by default (managed Postgres requires it); DATABASE_SSL=disable for
    // a local non-TLS Postgres. rejectUnauthorized:false = encrypted, CA not pinned.
    ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false },
  },
  strict: true,
  verbose: true,
} satisfies Config
