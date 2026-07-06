'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOrg } from '@/lib/org'
import { recordAudit } from '@/lib/audit'
import { metricKeySchema } from '@/lib/metrics/schemas'
import { ALERT_CONDITIONS } from '@/lib/watch/rules'
import { createRule, deleteRule, setAlertStatus } from '@/lib/watch/store'
import { runWatch } from '@/lib/watch/run'

export type AlertsFormState = { ok: boolean; message?: string }

const ruleSchema = z
  .object({
    metricKey: metricKeySchema,
    condition: z.enum(ALERT_CONDITIONS as [string, ...string[]]),
    threshold: z.coerce.number().finite().optional().or(z.literal('')),
  })
  .refine(
    (v) =>
      v.condition === 'below_target' ||
      v.condition === 'above_target' ||
      (typeof v.threshold === 'number'),
    { message: 'This condition needs a threshold', path: ['threshold'] }
  )

export async function createRuleAction(
  _prev: AlertsFormState,
  formData: FormData
): Promise<AlertsFormState> {
  const { orgId, userId } = await requireOrg()
  const parsed = ruleSchema.safeParse({
    metricKey: formData.get('metricKey'),
    condition: formData.get('condition'),
    threshold: formData.get('threshold') || '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const d = parsed.data
  await createRule(orgId, {
    metricKey: d.metricKey,
    condition: d.condition as (typeof ALERT_CONDITIONS)[number],
    threshold: typeof d.threshold === 'number' ? d.threshold : null,
  })
  await recordAudit({ orgId, userId, action: 'alert_rule.create', target: d.metricKey })
  revalidatePath('/dashboard/alerts')
  return { ok: true, message: 'Alert rule created.' }
}

export async function deleteRuleAction(
  _prev: AlertsFormState,
  formData: FormData
): Promise<AlertsFormState> {
  const { orgId } = await requireOrg()
  const id = String(formData.get('id') ?? '')
  if (id) await deleteRule(orgId, id)
  revalidatePath('/dashboard/alerts')
  return { ok: true }
}

export async function setAlertStatusAction(
  _prev: AlertsFormState,
  formData: FormData
): Promise<AlertsFormState> {
  const { orgId } = await requireOrg()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (id && (status === 'acknowledged' || status === 'resolved' || status === 'open')) {
    await setAlertStatus(orgId, id, status)
  }
  revalidatePath('/dashboard/alerts')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function runWatchNowAction(
  _prev: AlertsFormState,
  _formData: FormData
): Promise<AlertsFormState> {
  const { orgId, orgName, userEmail, userId } = await requireOrg()
  const res = await runWatch(orgId, orgName, userEmail)
  await recordAudit({ orgId, userId, action: 'watch.run', metadata: { newAlerts: res.newAlerts } })
  revalidatePath('/dashboard/alerts')
  revalidatePath('/dashboard')

  const emailBit = res.emailed
    ? ' Digest emailed.'
    : res.emailSkipped
      ? ' (email not configured)'
      : res.emailError
        ? ` (email error: ${res.emailError})`
        : ''
  return {
    ok: true,
    message: `Watch ran: ${res.newAlerts} new alert(s), ${res.insights} insight(s).${emailBit}`,
  }
}
