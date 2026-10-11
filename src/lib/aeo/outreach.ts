import { and, asc, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoMailSend, aeoMailTemplate, aeoPanel, aeoRequest, aeoRun } from '@/lib/db/schema'
import { sendEmail, type EmailAddress } from '@/lib/email/provider'
import { appUrl } from './emails'
import { merge, renderMail, type Fields } from './mail-format'
import { stateInfo } from './states'
import { newVerifyToken } from './tokens'

/**
 * One-at-a-time follow-up email to snapshot leads, sent from /dashboard/email.
 *
 * Only leads who ticked "You can contact me about improving these results"
 * can be emailed, as the privacy page promises, and never after they
 * unsubscribe or the retention sweep erases their details. Outbound prospect
 * snapshots never qualify: those people didn't ask us for anything.
 * Callers must check the session first.
 */

/** Who may get a follow-up. Used for the list and checked again at send time. */
const eligible = and(
  eq(aeoRequest.source, 'form'),
  eq(aeoRequest.contactConsent, true),
  isNull(aeoRequest.unsubscribedAt),
  isNull(aeoRequest.anonymizedAt),
  isNotNull(aeoRequest.verifiedAt),
  ne(aeoRequest.email, ''),
  eq(aeoRun.status, 'done')
)

const leadColumns = {
  requestId: aeoRequest.id,
  createdAt: aeoRequest.createdAt,
  email: aeoRequest.email,
  businessName: aeoRequest.businessName,
  domain: aeoRequest.domain,
  service: aeoRequest.service,
  city: aeoRequest.city,
  state: aeoRequest.state,
  leadStatus: aeoRequest.leadStatus,
  panelName: aeoPanel.name,
  runId: aeoRun.id,
  publicId: aeoRun.publicId,
  citedCount: aeoRun.citedCount,
  questionCount: aeoRun.questionCount,
  finishedAt: aeoRun.finishedAt,
  reportViews: aeoRun.reportViewCount,
  bookingClicks: sql<number>`(select count(*) from aeo_booking_click c where c.run_id = ${aeoRun.id})::int`,
  emailsSent: sql<number>`(select count(*) from aeo_mail_send s where s.request_id = ${aeoRequest.id} and s.status = 'sent')::int`,
  lastEmailAt: sql<Date | null>`(select max(s.sent_at) from aeo_mail_send s where s.request_id = ${aeoRequest.id} and s.status = 'sent')`,
}

export async function listEmailLeads() {
  const rows = await db
    .select(leadColumns)
    .from(aeoRequest)
    .innerJoin(aeoRun, eq(aeoRequest.runId, aeoRun.id))
    .leftJoin(aeoPanel, eq(aeoRequest.panelSlug, aeoPanel.slug))
    .where(eligible)
    .orderBy(desc(aeoRequest.createdAt))
    .limit(500)
  return rows.map((r) => ({ ...r, lastEmailAt: r.lastEmailAt ? new Date(r.lastEmailAt) : null }))
}

export type EmailLead = Awaited<ReturnType<typeof listEmailLeads>>[number]

/** One lead, if they may still be emailed. */
export async function getEmailLead(requestId: string): Promise<EmailLead | null> {
  const [row] = await db
    .select(leadColumns)
    .from(aeoRequest)
    .innerJoin(aeoRun, eq(aeoRequest.runId, aeoRun.id))
    .leftJoin(aeoPanel, eq(aeoRequest.panelSlug, aeoPanel.slug))
    .where(and(eq(aeoRequest.id, requestId), eligible))
    .limit(1)
  return row ? { ...row, lastEmailAt: row.lastEmailAt ? new Date(row.lastEmailAt) : null } : null
}

/**
 * Typed values can't add Markdown: the business name comes from a public form,
 * and "[click](https://...)" there would otherwise render as a link.
 */
function plain(value: string | null | undefined): string {
  return (value ?? '').replace(/[[\]*]/g, '').replace(/\s+/g, ' ').trim()
}

/** The merge fields for one lead. */
export function leadFields(lead: Pick<
  EmailLead,
  'businessName' | 'domain' | 'service' | 'city' | 'state' | 'panelName' | 'publicId' | 'citedCount' | 'questionCount'
>): Fields {
  const hasScore = typeof lead.citedCount === 'number' && typeof lead.questionCount === 'number'
  return {
    business: plain(lead.businessName),
    domain: plain(lead.domain),
    service: plain(lead.service),
    city: plain(lead.city),
    state: plain(stateInfo(lead.state)?.name ?? lead.state),
    industry: plain(lead.panelName),
    score: hasScore ? `${lead.citedCount} of ${lead.questionCount}` : '',
    report_url: lead.publicId ? appUrl(`/report/${lead.publicId}`) : '',
    book_url: lead.publicId ? appUrl(`/book?r=${lead.publicId}`) : '',
  }
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export async function listTemplates(options: { activeOnly?: boolean } = {}) {
  return db
    .select()
    .from(aeoMailTemplate)
    .where(options.activeOnly ? eq(aeoMailTemplate.isActive, true) : undefined)
    .orderBy(asc(aeoMailTemplate.position), asc(aeoMailTemplate.name))
}

export async function getTemplate(id: string) {
  const [row] = await db.select().from(aeoMailTemplate).where(eq(aeoMailTemplate.id, id)).limit(1)
  return row ?? null
}

export async function saveTemplate(values: {
  id?: string
  name: string
  description: string
  subject: string
  body: string
  isActive: boolean
}): Promise<string> {
  if (values.id) {
    const [row] = await db
      .update(aeoMailTemplate)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(aeoMailTemplate.id, values.id))
      .returning({ id: aeoMailTemplate.id })
    if (!row) throw new Error('Template not found')
    return row.id
  }
  const slug = `${values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'template'}-${Date.now().toString(36)}`
  const [{ max }] = (await db.execute(sql`select coalesce(max(position), 0)::int as max from aeo_mail_template`)).rows as {
    max: number
  }[]
  const [row] = await db
    .insert(aeoMailTemplate)
    .values({ ...values, slug, position: Number(max) + 1 })
    .returning({ id: aeoMailTemplate.id })
  return row.id
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

/** Sender settings. Replies go to OUTREACH_REPLY_TO, falling back to AEO_CONTACT_EMAIL. */
export function outreachConfig(env: Record<string, string | undefined> = process.env) {
  const fromEmail = env.OUTREACH_FROM?.trim() || env.MAILTRAP_SENDER?.trim() || ''
  const replyTo = env.OUTREACH_REPLY_TO?.trim() || env.AEO_CONTACT_EMAIL?.trim() || ''
  const bcc = (env.OUTREACH_BCC ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    from: fromEmail ? ({ email: fromEmail, name: env.OUTREACH_FROM_NAME?.trim() || 'Bill Leonard' } as EmailAddress) : null,
    replyTo: replyTo ? ({ email: replyTo } as EmailAddress) : null,
    bcc,
    /** Where test sends go. */
    testTo: bcc[0] || env.AEO_ADMIN_EMAIL?.trim() || replyTo,
    postalAddress: env.AEO_POSTAL_ADDRESS?.trim() || undefined,
  }
}

export type SendOutcome = { ok: true; test: boolean; to: string } | { ok: false; error: string }

/**
 * Merge, render, and send one email. A test goes to the test address with
 * "[TEST]" in the subject and is not logged; a real send is logged either way
 * and moves a "new" lead to "contacted".
 */
export async function sendFollowUp(params: {
  requestId: string
  templateId: string | null
  subject: string
  body: string
  test: boolean
  userId: string
}): Promise<SendOutcome> {
  const lead = await getEmailLead(params.requestId)
  if (!lead) return { ok: false, error: 'This lead can no longer be emailed: they unsubscribed, withdrew consent, or their details were erased.' }

  const fields = leadFields(lead)
  const subject = merge(params.subject, fields)
  const body = merge(params.body, fields)
  const missing = [...new Set([...subject.missing, ...body.missing])]
  if (missing.length) return { ok: false, error: `Fill or remove these fields first: ${missing.map((m) => `@${m}`).join(', ')}` }
  if (!subject.text.trim() || !body.text.trim()) return { ok: false, error: 'The subject and body need some text.' }

  const config = outreachConfig()
  if (!config.from) return { ok: false, error: 'Set OUTREACH_FROM or MAILTRAP_SENDER to send email.' }

  const { token, hash } = newVerifyToken()
  const unsubscribeUrl = appUrl(`/check/unsubscribe?token=${token}`)
  const { html, text } = renderMail(body.text, { unsubscribeUrl, postalAddress: config.postalAddress })
  const to = params.test ? config.testTo : lead.email
  if (!to) return { ok: false, error: 'No test address: set OUTREACH_BCC or AEO_ADMIN_EMAIL.' }

  const result = await sendEmail({
    to,
    subject: params.test ? `[TEST] ${subject.text}` : subject.text,
    html,
    text,
    from: config.from,
    replyTo: config.replyTo ?? undefined,
    bcc: params.test ? undefined : config.bcc,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
  })
  if (params.test) return result.sent ? { ok: true, test: true, to } : { ok: false, error: result.error ?? result.skipped ?? 'Not sent' }

  await db.insert(aeoMailSend).values({
    requestId: lead.requestId,
    templateId: params.templateId,
    toEmail: lead.email,
    subject: subject.text,
    body: body.text,
    status: result.sent ? 'sent' : 'failed',
    error: result.sent ? null : (result.error ?? result.skipped ?? 'Not sent'),
    tokenHash: result.sent ? hash : null,
    userId: params.userId,
  })
  if (!result.sent) return { ok: false, error: result.error ?? result.skipped ?? 'Not sent' }

  await db
    .update(aeoRequest)
    .set({ leadStatus: 'contacted' })
    .where(and(eq(aeoRequest.id, lead.requestId), eq(aeoRequest.leadStatus, 'new')))
  return { ok: true, test: false, to }
}

export async function sendsForRequest(requestId: string) {
  return db
    .select({
      id: aeoMailSend.id,
      subject: aeoMailSend.subject,
      body: aeoMailSend.body,
      status: aeoMailSend.status,
      error: aeoMailSend.error,
      sentAt: aeoMailSend.sentAt,
      templateName: aeoMailTemplate.name,
    })
    .from(aeoMailSend)
    .leftJoin(aeoMailTemplate, eq(aeoMailSend.templateId, aeoMailTemplate.id))
    .where(eq(aeoMailSend.requestId, requestId))
    .orderBy(desc(aeoMailSend.sentAt))
}

export async function recentSends(limit = 20) {
  return db
    .select({
      id: aeoMailSend.id,
      requestId: aeoMailSend.requestId,
      businessName: aeoRequest.businessName,
      domain: aeoRequest.domain,
      subject: aeoMailSend.subject,
      status: aeoMailSend.status,
      error: aeoMailSend.error,
      sentAt: aeoMailSend.sentAt,
    })
    .from(aeoMailSend)
    .innerJoin(aeoRequest, eq(aeoMailSend.requestId, aeoRequest.id))
    .orderBy(desc(aeoMailSend.sentAt))
    .limit(limit)
}
