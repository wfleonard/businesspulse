import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { hash, verify } from '@node-rs/argon2'
import { db } from '@/lib/db'
import { schema } from '@/lib/db/schema'

const isProd = process.env.NODE_ENV === 'production'

/**
 * better-auth server instance.
 *
 * - Email + password auth with Argon2id hashing (@node-rs/argon2).
 * - Secure, httpOnly, SameSite=Lax session cookies (Secure in prod).
 * - Drizzle adapter mapped to our Postgres schema.
 *
 * Sign-up is disabled by default in the single-user MVP; the initial user is
 * provisioned via a seed script. Flip BP_ALLOW_SIGNUP=true to open registration.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.BP_ALLOW_SIGNUP !== 'true',
    password: {
      // @node-rs/argon2 defaults to Argon2id.
      hash: (password: string) => hash(password),
      verify: ({ hash: hashed, password }: { hash: string; password: string }) =>
        verify(hashed, password),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once/day
  },
  advanced: {
    cookiePrefix: 'bp',
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
    },
  },
})

export type Auth = typeof auth
