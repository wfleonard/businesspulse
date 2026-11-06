import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha } from 'better-auth/plugins'
import { hash, verify } from '@node-rs/argon2'
import { and, eq, isNotNull } from 'drizzle-orm'
import { passwordLinkEmail, PASSWORD_LINK_HOURS, verifyEmailEmail } from '@/lib/access/emails'
import { signupOpen, VERIFY_LINK_HOURS } from '@/lib/access/signup'
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
 * Sign-up at /signup makes customers (docs/pulse-plan.md), and only while
 * BP_ALLOW_SIGNUP=true. A new account must confirm its email before it can sign
 * in; signing in unconfirmed sends a fresh link. Turnstile guards sign-up only.
 * Admins come from the seed script or an approved access request, and set
 * their password through the reset flow below: a user with no password yet
 * gets a set-password email, everyone else a reset email.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: !signupOpen(),
    requireEmailVerification: true,
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
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: VERIFY_LINK_HOURS * 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      const result = await sendEmail({ to: user.email, ...verifyEmailEmail({ name: user.name, url }) })
      if (!result.sent) {
        console.error('verification link not emailed:', result.skipped ?? result.error)
        if (!isProd) console.info(`verification link for ${user.email}: ${url}`)
      }
    },
  },
  // Without a secret the check is skipped in development and, in production,
  // the plugin refuses every sign-up, so a missing key never opens it to bots.
  plugins:
    process.env.TURNSTILE_SECRET_KEY || isProd
      ? [
          captcha({
            provider: 'cloudflare-turnstile',
            secretKey: process.env.TURNSTILE_SECRET_KEY ?? '',
            endpoints: ['/sign-up/email'],
          }),
        ]
      : [],
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
