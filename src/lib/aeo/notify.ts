import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sendEmail, type EmailPayload, type SendResult } from '@/lib/email/provider'
import { adminRunFailedEmail, appUrl, reportReadyEmail } from './emails'

/**
 * AEO notifications, sent by the worker.
 *
 * Report-ready emails go out from a sweep instead of right after a run
 * finishes. That covers a worker that dies between storing results and
 * sending, and a request that was pointed at an already-finished run.
 */

type Send = (payload: EmailPayload) => Promise<SendResult>
type Row = Record<string, unknown>

export const REPORT_EMAIL_MAX_ATTEMPTS = 5
/** Only requests verified this recently are emailed; older ones are stale. */
const REPORT_EMAIL_WINDOW_DAYS = 7

/**
 * Email every verified request whose run is done and hasn't been emailed yet.
 *
 * Each request is claimed with a conditional update before sending, so two
 * workers never send the same email. A failed send is retried on later sweeps,
 * backing off a minute per attempt, up to REPORT_EMAIL_MAX_ATTEMPTS.
 */
export async function sendPendingReportEmails(
  options: { send?: Send; limit?: number } = {}
): Promise<{ sent: number; failed: number }> {
  const send = options.send ?? sendEmail
  const limit = options.limit ?? 20

  const due = await db.execute(sql`
    select q.id, q.email, q.business_name, q.domain, q.report_email_attempts,
           r.public_id, r.question_count, r.cited_count
    from aeo_request q
    join aeo_run r on r.id = q.run_id
    where r.status = 'done'
      and q.source = 'form'
      and q.verified_at is not null
      and q.verified_at > now() - ${REPORT_EMAIL_WINDOW_DAYS}::int * interval '1 day'
      and q.report_emailed_at is null
      and q.report_email_attempts < ${REPORT_EMAIL_MAX_ATTEMPTS}::int
      and (q.report_email_attempted_at is null
           or q.report_email_attempted_at < now() - q.report_email_attempts * interval '1 minute')
    order by q.verified_at
    limit ${limit}::int
  `)

  let sent = 0
  let failed = 0

  for (const row of due.rows as Row[]) {
    const id = String(row.id)
    const claimed = await db.execute(sql`
      update aeo_request
      set report_email_attempts = report_email_attempts + 1,
          report_email_attempted_at = now()
      where id = ${id}
        and report_emailed_at is null
        and report_email_attempts = ${Number(row.report_email_attempts)}::int
      returning id
    `)
    if (claimed.rows.length === 0) continue

    const result = await send({
      to: String(row.email),
      ...reportReadyEmail({
        businessName: String(row.business_name),
        domain: String(row.domain),
        reportUrl: appUrl(`/report/${String(row.public_id)}`),
        citedCount: row.cited_count === null ? null : Number(row.cited_count),
        questionCount: row.question_count === null ? null : Number(row.question_count),
      }),
    })

    if (result.sent) {
      await db.execute(sql`update aeo_request set report_emailed_at = now() where id = ${id}`)
      sent++
    } else {
      console.warn(`report email for request ${id} not sent:`, result.error ?? result.skipped)
      failed++
    }
  }

  return { sent, failed }
}

/**
 * Tell the admin a run has failed for good. Best effort: nothing is recorded,
 * and it's a no-op without AEO_ADMIN_EMAIL.
 */
export async function notifyRunFailed(
  runId: string,
  error: string,
  options: { send?: Send } = {}
): Promise<SendResult> {
  const admin = process.env.AEO_ADMIN_EMAIL
  if (!admin) return { sent: false, skipped: 'AEO_ADMIN_EMAIL is not set' }

  const runRows = await db.execute(sql`
    select public_id, domain, attempts, panel_source, panel_slug from aeo_run where id = ${runId}
  `)
  const run = runRows.rows[0] as Row | undefined
  if (!run) return { sent: false, skipped: 'run no longer exists' }

  const requestRows = await db.execute(sql`
    select business_name, email, service, city, state, contact_consent
    from aeo_request where run_id = ${runId} order by created_at
  `)

  return (options.send ?? sendEmail)({
    to: admin,
    ...adminRunFailedEmail({
      runId,
      publicId: String(run.public_id),
      domain: String(run.domain),
      attempts: Number(run.attempts),
      panel: run.panel_slug ? String(run.panel_slug) : `(${String(run.panel_source)})`,
      error,
      requests: (requestRows.rows as Row[]).map((r) => ({
        businessName: String(r.business_name),
        email: String(r.email),
        service: String(r.service),
        location: `${String(r.city)}, ${String(r.state)}`,
        contactConsent: Boolean(r.contact_consent),
      })),
    }),
  })
}
