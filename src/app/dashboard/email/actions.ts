'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { unknownFields } from '@/lib/aeo/mail-format'
import { saveTemplate, sendFollowUp } from '@/lib/aeo/outreach'
import { recordAudit } from '@/lib/audit'
import { requireAdmin } from '@/lib/session'

/**
 * Follow-up email actions. Each re-checks the session itself: a server action
 * is a public endpoint, and the dashboard layout's check doesn't cover it.
 */

export type MailFormState = { message?: string; error?: string }

const sendSchema = z.object({
  requestId: z.uuid(),
  templateId: z.union([z.uuid(), z.literal('')]),
  subject: z.string().max(300),
  body: z.string().max(20000),
  mode: z.enum(['send', 'test']),
})

export async function sendFollowUpAction(_previous: MailFormState, formData: FormData): Promise<MailFormState> {
  const { user } = await requireAdmin()
  const parsed = sendSchema.safeParse({
    requestId: formData.get('requestId'),
    templateId: formData.get('templateId') ?? '',
    subject: formData.get('subject') ?? '',
    body: formData.get('body') ?? '',
    mode: formData.get('mode'),
  })
  if (!parsed.success) return { error: 'Invalid request.' }
  const { requestId, templateId, subject, body, mode } = parsed.data

  const outcome = await sendFollowUp({
    requestId,
    templateId: templateId || null,
    subject,
    body,
    test: mode === 'test',
    userId: user.id,
  })
  if (!outcome.ok) return { error: outcome.error }

  if (!outcome.test) {
    // IDs only: the email text stays in aeo_mail_send, where retention can erase it.
    await recordAudit({ userId: user.id, action: 'aeo.email_sent', target: requestId, metadata: { templateId: templateId || null } })
    revalidatePath('/dashboard/email')
    revalidatePath(`/dashboard/email/${requestId}`)
    revalidatePath('/dashboard/aeo')
  }
  return { message: outcome.test ? `Test sent to ${outcome.to}.` : `Sent to ${outcome.to}.` }
}

const templateSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  isActive: z.boolean(),
})

export async function saveTemplateAction(_previous: MailFormState, formData: FormData): Promise<MailFormState> {
  const { user } = await requireAdmin()
  const parsed = templateSchema.safeParse({
    id: formData.get('id') ?? '',
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    subject: formData.get('subject'),
    body: formData.get('body'),
    isActive: formData.get('isActive') === 'on',
  })
  if (!parsed.success) return { error: 'A template needs a name, a subject, and a body.' }

  const unknown = unknownFields(`${parsed.data.subject}\n${parsed.data.body}`)
  if (unknown.length) {
    return { error: `No lead can fill ${unknown.map((f) => `@${f}`).join(', ')}. Check the spelling against the field list.` }
  }

  const id = await saveTemplate({ ...parsed.data, id: parsed.data.id || undefined })
  await recordAudit({ userId: user.id, action: 'aeo.email_template_saved', target: id })
  revalidatePath('/dashboard/email/templates')
  redirect('/dashboard/email/templates')
}
