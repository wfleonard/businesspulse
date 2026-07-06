'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOrg } from '@/lib/org'
import { recordAudit } from '@/lib/audit'
import { parseApiConfig } from '@/lib/connectors/config'
import { createApiSource, deleteSource } from '@/lib/connectors/store'
import { syncSourceById } from '@/lib/connectors/sync'

export type SourceFormState = { ok: boolean; message?: string; errors?: string[] }

const nameSchema = z.string().trim().min(1, 'Name is required').max(120)

export async function createSourceAction(
  _prev: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  const { orgId, userId } = await requireOrg()

  const name = nameSchema.safeParse(formData.get('name'))
  if (!name.success) {
    return { ok: false, errors: name.error.issues.map((i) => i.message) }
  }

  let json: unknown
  try {
    json = JSON.parse(String(formData.get('config') ?? ''))
  } catch {
    return { ok: false, errors: ['Config is not valid JSON'] }
  }

  const parsed = parseApiConfig(json)
  if (!parsed.ok) return { ok: false, errors: parsed.errors }

  const id = await createApiSource(orgId, name.data, parsed.config)
  await recordAudit({ orgId, userId, action: 'source.create', target: id })

  revalidatePath('/dashboard/sources')
  return { ok: true, message: `Created source “${name.data}”. Run a sync to pull data.` }
}

export async function syncSourceAction(
  _prev: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  const { orgId, userId } = await requireOrg()
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'Missing source id' }

  const summary = await syncSourceById(orgId, id)
  if (!summary) return { ok: false, message: 'Source not found' }

  await recordAudit({
    orgId,
    userId,
    action: 'source.sync',
    target: id,
    metadata: { inserted: summary.inserted, ok: summary.ok },
  })

  revalidatePath('/dashboard/sources')
  revalidatePath('/dashboard')

  if (!summary.ok) {
    return { ok: false, message: `Sync failed: ${summary.errors.slice(0, 2).join('; ')}` }
  }
  const warn = summary.errors.length ? ` (${summary.errors.length} row warning(s))` : ''
  return { ok: true, message: `Synced ${summary.inserted} value(s).${warn}` }
}

export async function deleteSourceAction(
  _prev: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  const { orgId, userId } = await requireOrg()
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'Missing source id' }

  await deleteSource(orgId, id)
  await recordAudit({ orgId, userId, action: 'source.delete', target: id })
  revalidatePath('/dashboard/sources')
  return { ok: true, message: 'Source deleted.' }
}
