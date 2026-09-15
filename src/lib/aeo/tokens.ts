import { createHash, randomBytes } from 'crypto'

/** Verification links expire after 24 hours. */
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/** sha256, hex. Only the hash is stored, so a database leak can't verify anything. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** A new emailed verification token: 32 random bytes, base64url (43 characters). */
export function newVerifyToken(now: Date = new Date()): {
  token: string
  hash: string
  expiresAt: Date
} {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token), expiresAt: new Date(now.getTime() + VERIFY_TOKEN_TTL_MS) }
}

/** Shape check before touching the database. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

/** Public report ID: 18 random bytes, base64url (24 characters). */
export function newPublicId(): string {
  return randomBytes(18).toString('base64url')
}
