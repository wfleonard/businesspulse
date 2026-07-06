'use server'

import { revalidatePath } from 'next/cache'
import { requireOrg } from '@/lib/org'
import { recordAudit } from '@/lib/audit'
import { aiConfigured } from '@/lib/ai/model'
import { generateAndStore } from '@/lib/actions/run'
import { setRecommendationStatus } from '@/lib/actions/store'

export type ActionsState = { ok: boolean; message?: string }

export async function generateRecommendationsAction(
  _prev: ActionsState,
  _formData: FormData
): Promise<ActionsState> {
  const { orgId, orgName, userId } = await requireOrg()
  if (!aiConfigured()) {
    return { ok: false, message: 'AI is not configured (set ANTHROPIC_API_KEY).' }
  }
  const recs = await generateAndStore(orgId, orgName)
  await recordAudit({ orgId, userId, action: 'recommendation.generate', metadata: { count: recs.length } })
  revalidatePath('/dashboard/actions')
  revalidatePath('/dashboard')
  return {
    ok: true,
    message: recs.length
      ? `Generated ${recs.length} recommendation(s).`
      : 'No recommendations right now — not enough signal in the data.',
  }
}

export async function setRecommendationStatusAction(
  _prev: ActionsState,
  formData: FormData
): Promise<ActionsState> {
  const { orgId, userId } = await requireOrg()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (
    id &&
    (status === 'accepted' || status === 'dismissed' || status === 'done' || status === 'suggested')
  ) {
    await setRecommendationStatus(orgId, id, status)
    await recordAudit({ orgId, userId, action: `recommendation.${status}`, target: id })
  }
  revalidatePath('/dashboard/actions')
  revalidatePath('/dashboard')
  return { ok: true }
}
