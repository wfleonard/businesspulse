import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { hash, verify } from '@node-rs/argon2'
import { and, eq, isNotNull } from 'drizzle-orm'
import { passwordLinkEmail, PASSWORD_LINK_HOURS } from '@/lib/access/emails'
import { db } from '@/lib/db'
import { account, schema } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/provider'

const isProd = process.env.NODE_ENV === 'production'

/**
 * better-auth server instance.
 *
 * - Email + password auth with Argon2id hashing (@node-rs/argon2).
 * - Secure, httpOnly, SameSite=Lax session cookies (Secure in prod).
 * - Drizzle adapter mapped to our Postgres schema.
 *
 * Sign-up is disabled: every signed-in user sees every lead, so people ask at
 * /request-access and an admin approves them (src/lib/access/requests.ts).
 * Approval and "forgot password" both use the reset flow below: a user with no
 * password yet gets a set-password email, everyone else a reset email. The
 * first user still comes from the seed script. BP_ALLOW_SIGNUP=true reopens
 * self-serve registration; leave it off in production.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.BP_ALLOW_SIGNUP !== 'true',
    minPasswordLength: 12,
    resetPasswordTokenExpiresIn: PASSWORD_LINK_HOURS * 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const [credential] = await db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, user.id), eq(account.providerId, 'credential'), isNotNull(account.password)))
        .limit(1)
      const result = await sendEmail({ to: user.email, ...passwordLinkEmail({ name: user.name, url, isNew: !credential }) })
      if (!result.sent) {
        console.error('password link not emailed:', result.skipped ?? result.error)
        // Lets the flow be tested locally without an email provider.
        if (!isProd) console.info(`password link for ${user.email}: ${url}`)
      }
    },
    password: {
      // @node-rs/argon2 defaults to Argon2id.
      hash: (password: string) => hash(password),
      verify: ({ hash: hashed, password }: { hash: string; password: string }) =>
        verify(hashed, password),
    },
  },
  user: {
    additionalFields: {
      // On the session so every request can check it. input: false keeps
      // sign-up from choosing its own role.
      role: { type: 'string', required: false, defaultValue: 'customer', input: false },
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
