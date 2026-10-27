'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  approveAccessRequest,
  declineAccessRequest,
  findUserEmail,
  removeUser,
  sendPasswordLink,
} from '@/lib/access/requests'
import { recordAudit } from '@/lib/audit'
import { requireAdmin } from '@/lib/session'

/**
 * Admin actions for logins. Each re-checks the session itself: a server action
 * is a public endpoint, and the dashboard layout's check doesn't cover it.
 */

function done(notice: string, isError = false): never {
  revalidatePath('/dashboard/users')
  redirect(`/dashboard/users?${new URLSearchParams({ [isError ? 'error' : 'notice']: notice })}`)
}

const requestId = z.object({ requestId: z.uuid() })
const userId = z.object({ userId: z.string().min(1).max(64) })

export async function approveRequest(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = requestId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')

  const result = await approveAccessRequest(parsed.data.requestId, user.id)
  if (!result.ok) done(result.error, true)
  await recordAudit({ userId: user.id, action: 'access.request_approved', target: parsed.data.requestId })
  done(`Approved. ${result.email} has been emailed a link to set a password.`)
}

export async function declineRequest(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = requestId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')

  const result = await declineAccessRequest(parsed.data.requestId, user.id)
  if (!result.ok) done(result.error, true)
  await recordAudit({ userId: user.id, action: 'access.request_declined', target: parsed.data.requestId })
  done(`Declined the request from ${result.email}. They aren't emailed.`)
}

export async function resendPasswordLink(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = userId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')

  const email = await findUserEmail(parsed.data.userId)
  if (!email) done('That user no longer exists.', true)
  await sendPasswordLink(email)
  await recordAudit({ userId: user.id, action: 'access.password_link_sent', target: parsed.data.userId })
  done(`Emailed a password link to ${email}.`)
}

export async function removeAccess(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = userId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  if (parsed.data.userId === user.id) done("You can't remove your own login.", true)

  const email = await findUserEmail(parsed.data.userId)
  if (!email || !(await removeUser(parsed.data.userId))) done('That user no longer exists.', true)
  await recordAudit({ userId: user.id, action: 'access.user_removed', target: email })
  done(`Removed ${email}. They're signed out everywhere.`)
}
