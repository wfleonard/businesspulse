'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAudit } from '@/lib/audit'
import { queueBrief } from '@/lib/aeo/brief-jobs'
import { startPulseRun } from '@/lib/aeo/pulse'
import { requireAdmin } from '@/lib/session'

function done(notice: string, isError = false): never {
  revalidatePath('/dashboard/pulse')
  redirect(`/dashboard/pulse?${new URLSearchParams({ [isError ? 'error' : 'notice']: notice })}`)
}

const businessId = z.object({ businessId: z.uuid() })

/** Start a free Pulse run for a client business: testing, and Core prospects. Admins only. */
export async function startFreePulseRun(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = businessId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')

  const result = await startPulseRun(parsed.data.businessId)
  if (!result.ok) done(result.error, true)
  await recordAudit({ userId: user.id, action: 'pulse.run_started', target: result.publicId })
  done('Pulse run queued. It asks every question on all four assistants and usually takes 30 to 60 minutes.')
}

/** Read a business's site again now, ignoring the once-a-day limit. Admins only. */
export async function rereadSite(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = businessId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')

  const result = await queueBrief(parsed.data.businessId, { force: true })
  await recordAudit({ userId: user.id, action: 'pulse.brief_reread', target: parsed.data.businessId })
  const path = `/dashboard/pulse/${parsed.data.businessId}`
  revalidatePath(path)
  redirect(`${path}?${new URLSearchParams({ notice: result === 'in_progress' ? 'The site is already being read.' : 'Queued. The site is read again within a few minutes.' })}`)
}
