'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createRerun, deleteRequest, setLeadStatus } from '@/lib/aeo/admin'
import { LEAD_STATUSES } from '@/lib/aeo/lead-filters'
import { fieldErrors, prospectRequestSchema } from '@/lib/aeo/request-schema'
import { createProspectRequest } from '@/lib/aeo/requests'
import { recordAudit } from '@/lib/audit'
import { requireSession } from '@/lib/session'

/**
 * Admin actions for AEO leads. Each re-checks the session itself: a server
 * action is a public endpoint, and the dashboard layout's check doesn't cover it.
 */

const optionalRunId = z.union([z.uuid(), z.literal('')]).optional()

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const { user } = await requireSession()
  const parsed = z
    .object({ requestId: z.uuid(), runId: optionalRunId, status: z.enum(LEAD_STATUSES) })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid lead status update')

  const { requestId, runId, status } = parsed.data
  if (await setLeadStatus(requestId, status)) {
    await recordAudit({ userId: user.id, action: 'aeo.lead_status', target: requestId, metadata: { status } })
  }
  revalidatePath('/dashboard/aeo')
  if (runId) revalidatePath(`/dashboard/aeo/${runId}`)
}

export async function deleteLead(formData: FormData): Promise<void> {
  const { user } = await requireSession()
  const parsed = z.object({ requestId: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid delete request')

  const result = await deleteRequest(parsed.data.requestId)
  if (result.found) {
    // IDs only: the point of a deletion is that the personal data is gone.
    await recordAudit({
      userId: user.id,
      action: 'aeo.lead_deleted',
      target: parsed.data.requestId,
      metadata: { runDeleted: result.runDeleted },
    })
  }
  revalidatePath('/dashboard/aeo')
  redirect('/dashboard/aeo')
}

export type ProspectFormState = {
  error?: string
  fields?: Record<string, string>
  /** What was submitted, so the form keeps it after an error. */
  values?: Record<string, string>
}

/** Start an outbound prospect snapshot, then go to its run page for the report link. */
export async function createProspectSnapshot(
  _previous: ProspectFormState,
  formData: FormData
): Promise<ProspectFormState> {
  const { user } = await requireSession()
  const values = Object.fromEntries(
    [...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )

  const parsed = prospectRequestSchema.safeParse(values)
  if (!parsed.success) {
    return { error: 'Please fix the highlighted fields.', fields: fieldErrors(parsed.error), values }
  }

  const result = await createProspectRequest(parsed.data)
  await recordAudit({
    userId: user.id,
    action: 'aeo.prospect_snapshot',
    target: result.runId,
    metadata: { reused: result.reused },
  })
  revalidatePath('/dashboard/aeo')
  redirect(`/dashboard/aeo/${result.runId}?started=${result.reused ? 'reused' : 'new'}`)
}

export async function rerunSnapshot(formData: FormData): Promise<void> {
  const { user } = await requireSession()
  const parsed = z.object({ runId: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid re-run request')

  const nextRunId = await createRerun(parsed.data.runId)
  if (!nextRunId) throw new Error('Run not found')

  await recordAudit({
    userId: user.id,
    action: 'aeo.rerun',
    target: parsed.data.runId,
    metadata: { newRunId: nextRunId },
  })
  revalidatePath('/dashboard/aeo')
  redirect(`/dashboard/aeo/${nextRunId}`)
}
