'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { recordAudit } from '@/lib/audit'
import { queueBrief } from '@/lib/aeo/brief-jobs'
import { approvePanel, queuePanelDraft, savePanelEdits } from '@/lib/aeo/business-panel-jobs'
import { MAX_BUSINESS_QUESTIONS } from '@/lib/aeo/business-panel'
import { cleanDomains, MAX_QUESTION_LENGTH } from '@/lib/aeo/panel-content'
import { DRAFT_CATEGORIES } from '@/lib/aeo/panel-draft'
import { startPulseRun } from '@/lib/aeo/pulse'
import { queuePulseReport } from '@/lib/aeo/pulse-report-jobs'
import { declineFix, finishFix, quoteFix, startFix } from '@/lib/aeo/fix-requests'
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

function backTo(businessId: string, message: string, isError = false): never {
  const path = `/dashboard/pulse/${businessId}`
  revalidatePath(path)
  revalidatePath('/dashboard/pulse')
  redirect(`${path}?${new URLSearchParams({ [isError ? 'error' : 'notice']: message })}`)
}

/** Draft the business's panel again from its confirmed brief. Admins only. */
export async function redraftPanel(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = businessId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  const result = await queuePanelDraft(parsed.data.businessId)
  await recordAudit({ userId: user.id, action: 'pulse.panel_redraft', target: parsed.data.businessId })
  if (result === 'no_brief') backTo(parsed.data.businessId, 'The client needs to confirm their brief first.', true)
  backTo(
    parsed.data.businessId,
    result === 'in_progress' ? 'A draft is already being written.' : 'Queued. The new draft is usually ready within a few minutes.'
  )
}

const panelEditSchema = z.object({
  businessId: z.uuid(),
  panelId: z.uuid(),
  intent: z.enum(['save', 'approve']),
  payload: z.string().max(200_000),
})

const payloadSchema = z.object({
  questions: z
    .array(
      z.object({
        c: z.enum(DRAFT_CATEGORIES),
        q: z.string().trim().min(8, 'A question is too short').max(MAX_QUESTION_LENGTH, `Keep questions under ${MAX_QUESTION_LENGTH} characters`),
        offering: z.string().trim().max(120).default('general'),
        why: z.string().trim().max(200).default(''),
        origin: z.enum(['library', 'new', 'admin']).default('admin'),
      })
    )
    .min(1, 'Keep at least one question')
    .max(MAX_BUSINESS_QUESTIONS, `At most ${MAX_BUSINESS_QUESTIONS} questions`),
  directoryDomains: z.string().max(5000),
  referenceDomains: z.string().max(5000),
  note: z.string().trim().max(1000).default(''),
})

const domainList = (text: string) => cleanDomains(text.split(/[\s,;]+/).filter(Boolean))

/** Save the admin's edits to a business panel, and approve it if asked. Admins only. */
export async function saveBusinessPanel(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const form = panelEditSchema.safeParse(Object.fromEntries(formData))
  if (!form.success) throw new Error('Invalid request')
  const { businessId: bizId, panelId, intent } = form.data

  let raw: unknown
  try {
    raw = JSON.parse(form.data.payload)
  } catch {
    backTo(bizId, 'The edits could not be read. Reload and try again.', true)
  }
  const parsed = payloadSchema.safeParse(raw)
  if (!parsed.success) backTo(bizId, parsed.error.issues[0]?.message ?? 'Check the questions and try again.', true)

  const seen = new Set<string>()
  const questions = parsed.data.questions.filter((q) => {
    const key = q.q.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const saved = await savePanelEdits(panelId, {
    questions,
    directoryDomains: domainList(parsed.data.directoryDomains),
    referenceDomains: domainList(parsed.data.referenceDomains),
    note: parsed.data.note,
  })
  if (!saved.ok) backTo(bizId, saved.error, true)
  await recordAudit({ userId: user.id, action: 'pulse.panel_edited', target: saved.panelId })

  if (intent === 'approve') {
    const approved = await approvePanel(saved.panelId, user.id)
    if (!approved.ok) backTo(bizId, approved.error, true)
    await recordAudit({ userId: user.id, action: 'pulse.panel_approved', target: saved.panelId })
    backTo(bizId, `Approved with ${questions.length} questions. Pulse runs for this business now ask this panel.`)
  }
  backTo(bizId, saved.panelId === panelId ? 'Saved.' : 'Saved as a new draft version. Approve it to use it.')
}

const rewriteSchema = z.object({ runId: z.uuid(), publicId: z.string().min(10).max(64) })

/** Check the site again and rewrite a Pulse report's fix list. Admins only. */
export async function rewriteFixes(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = rewriteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  await queuePulseReport(parsed.data.runId)
  await recordAudit({ userId: user.id, action: 'pulse.fixes_rewrite', target: parsed.data.runId })
  const path = `/dashboard/pulse/report/${parsed.data.publicId}`
  revalidatePath(path)
  redirect(`${path}?${new URLSearchParams({ notice: 'Queued. The new fix list is written after any run in progress.' })}`)
}

/* ---------------------------- Fix requests --------------------------- */

const fixId = z.object({ fixId: z.uuid() })

function backToFix(id: string, message: string, isError = false): never {
  const path = `/dashboard/pulse/fix/${id}`
  revalidatePath(path)
  revalidatePath('/dashboard/pulse')
  redirect(`${path}?${new URLSearchParams({ [isError ? 'error' : 'notice']: message })}`)
}

const quoteSchema = fixId.extend({
  scope: z.string().trim().min(10, 'Describe what’s included').max(4000),
  amount: z.coerce.number().min(1, 'Enter an amount').max(100_000),
})

/** Confirm a fix's scope and amount; the client is emailed to pay. Admins only. */
export async function quoteFixAction(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const id = String(formData.get('fixId') ?? '')
    if (!z.uuid().safeParse(id).success) throw new Error('Invalid request')
    backToFix(id, parsed.error.issues[0]?.message ?? 'Check the scope and amount.', true)
  }
  const { fixId: id, scope, amount } = parsed.data
  const result = await quoteFix(id, scope, Math.round(amount * 100))
  if (!result.ok) backToFix(id, result.error, true)
  await recordAudit({ userId: user.id, action: 'fix.quoted', target: id })
  backToFix(id, 'Sent. The client is emailed to review the scope and pay from their account.')
}

const noteSchema = fixId.extend({ note: z.string().trim().max(4000).default('') })

export async function declineFixAction(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = noteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  const result = await declineFix(parsed.data.fixId, parsed.data.note)
  if (!result.ok) backToFix(parsed.data.fixId, result.error, true)
  await recordAudit({ userId: user.id, action: 'fix.declined', target: parsed.data.fixId })
  backToFix(parsed.data.fixId, 'Declined. The client is emailed.')
}

export async function startFixAction(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = fixId.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  const result = await startFix(parsed.data.fixId)
  if (!result.ok) backToFix(parsed.data.fixId, result.error, true)
  await recordAudit({ userId: user.id, action: 'fix.started', target: parsed.data.fixId })
  backToFix(parsed.data.fixId, 'Marked in progress. The client sees it in their account.')
}

export async function finishFixAction(formData: FormData): Promise<void> {
  const { user } = await requireAdmin()
  const parsed = noteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  const result = await finishFix(parsed.data.fixId, parsed.data.note)
  if (!result.ok) backToFix(parsed.data.fixId, result.error, true)
  await recordAudit({ userId: user.id, action: 'fix.done', target: parsed.data.fixId })
  backToFix(parsed.data.fixId, 'Marked done. The client is emailed.')
}
