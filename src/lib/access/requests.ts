import 'server-only'
import crypto from 'crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { accessRequest, account, user } from '@/lib/db/schema'
import { sendEmail, type SendResult } from '@/lib/email/provider'
import { adminAccessRequestEmail } from './emails'
import type { AccessRequestInput } from './schema'

/**
 * Access requests and the users they become. There are no roles: every
 * signed-in user sees every lead, so an admin approves each person by hand.
 */

/** Where the emailed link lands once better-auth has checked the token. */
export const RESET_PASSWORD_PATH = '/reset-password'

/** Saves the request, unless one from this email is already waiting. Returns its id, or null if it was a repeat. */
export async function createAccessRequest(input: AccessRequestInput, ipAddress: string | null): Promise<string | null> {
  const [pending] = await db
    .select({ id: accessRequest.id })
    .from(accessRequest)
    .where(and(eq(accessRequest.email, input.email), eq(accessRequest.status, 'pending')))
    .limit(1)
  if (pending) return null
  const [row] = await db
    .insert(accessRequest)
    .values({ name: input.name, email: input.email, note: input.note, ipAddress })
    .returning({ id: accessRequest.id })
  return row.id
}

/** Email the admin. Best effort: the request is already saved. */
export async function notifyAccessRequest(id: string, input: AccessRequestInput): Promise<SendResult> {
  const admin = process.env.AEO_ADMIN_EMAIL
  if (!admin) return { sent: false, skipped: 'AEO_ADMIN_EMAIL is not set' }
  const result = await sendEmail({
    to: admin,
    replyTo: { email: input.email, name: input.name },
    ...adminAccessRequestEmail(input),
  })
  if (result.sent) await db.update(accessRequest).set({ notifiedAt: new Date() }).where(eq(accessRequest.id, id))
  return result
}

export type AccessRequestRow = {
  id: string
  name: string
  email: string
  note: string
  status: 'pending' | 'approved' | 'declined'
  createdAt: Date
  decidedAt: Date | null
}

/** Pending requests first, then the most recent decisions. */
export async function listAccessRequests(limit = 50): Promise<AccessRequestRow[]> {
  return db
    .select({
      id: accessRequest.id,
      name: accessRequest.name,
      email: accessRequest.email,
      note: accessRequest.note,
      status: accessRequest.status,
      createdAt: accessRequest.createdAt,
      decidedAt: accessRequest.decidedAt,
    })
    .from(accessRequest)
    .orderBy(sql`${accessRequest.status} = 'pending' desc`, desc(accessRequest.createdAt))
    .limit(limit)
}

/** Sends a set-password link (new user) or reset link (existing password). Silent for unknown emails. */
export async function sendPasswordLink(email: string): Promise<void> {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: RESET_PASSWORD_PATH } })
}

export type DecisionResult = { ok: true; email: string } | { ok: false; error: string }

/**
 * Approve: create the user if there isn't one (no password yet), mark the
 * request, and email a link to set a password.
 */
export async function approveAccessRequest(id: string, adminId: string): Promise<DecisionResult> {
  const [request] = await db.select().from(accessRequest).where(eq(accessRequest.id, id)).limit(1)
  if (!request) return { ok: false, error: 'That request no longer exists.' }
  if (request.status !== 'pending') return { ok: false, error: `That request was already ${request.status}.` }

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, request.email)).limit(1)
  if (!existing) {
    const now = new Date()
    await db.insert(user).values({
      id: crypto.randomUUID(),
      name: request.name,
      email: request.email,
      // The emailed link proves the address before a password can be set.
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })
  }
  await db
    .update(accessRequest)
    .set({ status: 'approved', decidedAt: new Date(), decidedBy: adminId })
    .where(eq(accessRequest.id, id))
  await sendPasswordLink(request.email)
  return { ok: true, email: request.email }
}

export async function declineAccessRequest(id: string, adminId: string): Promise<DecisionResult> {
  const [row] = await db
    .update(accessRequest)
    .set({ status: 'declined', decidedAt: new Date(), decidedBy: adminId })
    .where(and(eq(accessRequest.id, id), eq(accessRequest.status, 'pending')))
    .returning({ email: accessRequest.email })
  return row ? { ok: true, email: row.email } : { ok: false, error: 'That request was already decided.' }
}

export type UserRow = { id: string; name: string; email: string; createdAt: Date; hasPassword: boolean }

export async function listUsers(): Promise<UserRow[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      // Spelled out: inside a subquery, ${user.id} would render as a bare "id" and match the account's own id.
      hasPassword: sql<boolean>`exists (select 1 from account a where a.user_id = "user"."id" and a.provider_id = 'credential' and a.password is not null)`,
    })
    .from(user)
    .orderBy(user.createdAt)
}

export async function findUserEmail(id: string): Promise<string | null> {
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, id)).limit(1)
  return row?.email ?? null
}

/** Whether the user has a password yet. A user without one was approved and hasn't used their link. */
export async function hasPassword(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential'), sql`${account.password} is not null`))
    .limit(1)
  return Boolean(row)
}

/** Deletes the user; their sessions and password go with them, and audit entries keep the action without the user. */
export async function removeUser(id: string): Promise<boolean> {
  const deleted = await db.delete(user).where(eq(user.id, id)).returning({ id: user.id })
  return deleted.length > 0
}
