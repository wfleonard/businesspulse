'use server'

import { revalidatePath } from 'next/cache'
import { requireOrg } from '@/lib/org'
import { recordAudit } from '@/lib/audit'
import { definitionInputSchema, valueInputSchema } from '@/lib/metrics/schemas'
import {
  upsertDefinition,
  recordValue,
  importRows,
} from '@/lib/metrics/mutations'
import { parseMetricCsv } from '@/lib/metrics/csv'

export type FormState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string>
}

const empty: FormState = { ok: false }

function fieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {}
  for (const i of issues) {
    const key = i.path[0] != null ? String(i.path[0]) : '_'
    if (!out[key]) out[key] = i.message
  }
  return out
}

export async function createDefinitionAction(
  _prev: FormState = empty,
  formData: FormData
): Promise<FormState> {
  const { orgId, userId } = await requireOrg()

  const parsed = definitionInputSchema.safeParse({
    key: formData.get('key'),
    label: formData.get('label'),
    unit: formData.get('unit') || '',
    category: formData.get('category') || '',
    direction: formData.get('direction'),
    target: formData.get('target') || '',
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors(parsed.error.issues) }
  }

  const d = parsed.data
  await upsertDefinition(orgId, {
    key: d.key,
    label: d.label,
    unit: d.unit || null,
    category: d.category || null,
    direction: d.direction,
    target: typeof d.target === 'number' ? d.target : null,
  })
  await recordAudit({ orgId, userId, action: 'metric.definition.upsert', target: d.key })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/metrics')
  return { ok: true, message: `Saved metric “${d.label}”.` }
}

export async function recordValueAction(
  _prev: FormState = empty,
  formData: FormData
): Promise<FormState> {
  const { orgId, userId } = await requireOrg()

  const parsed = valueInputSchema.safeParse({
    metricKey: formData.get('metricKey'),
    periodStart: formData.get('periodStart'),
    periodEnd: formData.get('periodEnd'),
    value: formData.get('value'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors(parsed.error.issues) }
  }

  const v = parsed.data
  await recordValue(orgId, {
    metricKey: v.metricKey,
    periodStart: v.periodStart,
    periodEnd: v.periodEnd,
    value: v.value,
  })
  await recordAudit({ orgId, userId, action: 'metric.value.record', target: v.metricKey })

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/metrics/${v.metricKey}`)
  return { ok: true, message: `Recorded ${v.metricKey} = ${v.value}.` }
}

export async function importCsvAction(
  _prev: FormState = empty,
  formData: FormData
): Promise<FormState> {
  const { orgId, userId } = await requireOrg()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Choose a CSV file to import.' }
  }
  if (file.size > 5_000_000) {
    return { ok: false, message: 'File too large (max 5 MB).' }
  }

  const text = await file.text()
  const { rows, errors } = parseMetricCsv(text)

  if (rows.length === 0) {
    const detail = errors.slice(0, 3).map((e) => `line ${e.line}: ${e.message}`)
    return { ok: false, message: `No valid rows. ${detail.join('; ')}` }
  }

  const inserted = await importRows(orgId, rows)
  await recordAudit({
    orgId,
    userId,
    action: 'metric.value.import',
    target: file.name,
    metadata: { inserted, skipped: errors.length },
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/metrics')
  const skipped = errors.length ? ` ${errors.length} row(s) skipped.` : ''
  return { ok: true, message: `Imported ${inserted} value(s).${skipped}` }
}
