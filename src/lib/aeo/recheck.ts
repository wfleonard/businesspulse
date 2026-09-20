import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sendEmail, type EmailPayload, type SendResult } from '@/lib/email/provider'
import { appUrl, recheckEmail } from './emails'
import { hashToken, newPublicId, newVerifyToken } from './tokens'

/**
 * The 30-day re-check: one fresh snapshot for a lead who asked to hear from
 * us, and an email comparing it with their first report.
 *
 * It spends money on people who aren't customers, so it is deliberately
 * narrow: public-form requests only, consent required, one per request, a
 * daily ceiling on new runs, and an off switch. The daily spend cap still
 * applies, because the worker claims these runs like any other.
 */

export const RECHECK_EMAIL_MAX_ATTEMPTS = 5

type Send = (payload: EmailPayload) => Promise<SendResult>
type Row = Record<string, unknown>

export type RecheckConfig = {
  recheckEnabled: boolean
  recheckDays: number
  recheckMaxPerDay: number
}

/** Queue re-check runs for consenting leads whose report is old enough. Returns how many started. */
export async function startDueRechecks(config: RecheckConfig): Promise<number> {
  if (!config.recheckEnabled) return 0

  const startedToday = await db.execute(sql`
    select count(*)::int as started from aeo_recheck where created_at >= date_trunc('day', now())
  `)
  const room = config.recheckMaxPerDay - Number((startedToday.rows[0] as Row).started)
  if (room <= 0) return 0

  const due = await db.execute(sql`
    select q.id, q.domain, q.panel_slug
    from aeo_request q
    join aeo_run r on r.id = q.run_id
    where q.source = 'form'
      and q.contact_consent
      and q.verified_at is not null
      and q.unsubscribed_at is null
      and r.status = 'done'
      and r.finished_at < now() - ${config.recheckDays}::int * interval '1 day'
      and not exists (select 1 from aeo_recheck c where c.request_id = q.id)
    order by r.finished_at
    limit ${room}::int
  `)

  let started = 0
  for (const row of due.rows as Row[]) {
    const panelSlug = (row.panel_slug as string | null) ?? null
    await db.transaction(async (tx) => {
      const inserted = await tx.execute(sql`
        insert into aeo_run (public_id, domain, panel_source, panel_slug)
        values (${newPublicId()}, ${String(row.domain)}, ${panelSlug ? 'canned' : 'generated'}, ${panelSlug})
        returning id
      `)
      const runId = String((inserted.rows[0] as Row).id)
      // One per request: the unique index on request_id's row is enforced by this check.
      await tx.execute(sql`
        insert into aeo_recheck (request_id, run_id)
        select ${String(row.id)}, ${runId}
        where not exists (select 1 from aeo_recheck c where c.request_id = ${String(row.id)})
      `)
    })
    started++
  }
  return started
}

/**
 * Email finished re-checks. Each is claimed before sending, so it goes out
 * once; a failed send is retried on later sweeps, backing off a minute per
 * attempt.
 */
export async function sendRecheckEmails(options: { send?: Send; limit?: number } = {}): Promise<{
  sent: number
  failed: number
}> {
  const send = options.send ?? sendEmail
  const limit = options.limit ?? 20

  const due = await db.execute(sql`
    select c.id, c.email_attempts, q.email, q.business_name, q.domain,
           first_run.cited_count as before_cited, first_run.question_count as before_total,
           new_run.cited_count as after_cited, new_run.question_count as after_total, new_run.public_id
    from aeo_recheck c
    join aeo_request q on q.id = c.request_id
    join aeo_run new_run on new_run.id = c.run_id
    join aeo_run first_run on first_run.id = q.run_id
    where c.emailed_at is null
      and q.unsubscribed_at is null
      and q.email <> ''
      and new_run.status = 'done'
      and c.email_attempts < ${RECHECK_EMAIL_MAX_ATTEMPTS}::int
      and (c.email_attempted_at is null
           or c.email_attempted_at < now() - c.email_attempts * interval '1 minute')
    order by c.created_at
    limit ${limit}::int
  `)

  let sent = 0
  let failed = 0

  for (const row of due.rows as Row[]) {
    const id = String(row.id)
    const claimed = await db.execute(sql`
      update aeo_recheck
      set email_attempts = email_attempts + 1, email_attempted_at = now()
      where id = ${id} and emailed_at is null and email_attempts = ${Number(row.email_attempts)}::int
      returning id
    `)
    if (claimed.rows.length === 0) continue

    // The unsubscribe token is only ever in the email; we keep its hash.
    const { token, hash } = newVerifyToken()
    await db.execute(sql`update aeo_recheck set token_hash = ${hash} where id = ${id}`)

    const result = await send({
      to: String(row.email),
      ...recheckEmail({
        businessName: String(row.business_name),
        domain: String(row.domain),
        before: { cited: Number(row.before_cited), total: Number(row.before_total) },
        after: { cited: Number(row.after_cited), total: Number(row.after_total) },
        reportUrl: appUrl(`/report/${String(row.public_id)}`),
        unsubscribeUrl: appUrl(`/check/unsubscribe?token=${token}`),
        postalAddress: process.env.AEO_POSTAL_ADDRESS?.trim() || undefined,
      }),
    })

    if (result.sent) {
      await db.execute(sql`update aeo_recheck set emailed_at = now() where id = ${id}`)
      sent++
    } else {
      console.warn(`re-check email for ${id} not sent:`, result.error ?? result.skipped)
      failed++
    }
  }

  return { sent, failed }
}

export type UnsubscribeOutcome = 'unsubscribed' | 'already' | 'invalid'

/** Unsubscribe from the token in a re-check email. Also clears contact consent. */
export async function unsubscribeByToken(token: string): Promise<UnsubscribeOutcome> {
  const found = await db.execute(sql`
    select q.id, q.unsubscribed_at is not null as already
    from aeo_recheck c join aeo_request q on q.id = c.request_id
    where c.token_hash = ${hashToken(token)}
  `)
  const row = found.rows[0] as Row | undefined
  if (!row) return 'invalid'
  if (row.already) return 'already'

  await db.execute(sql`
    update aeo_request set unsubscribed_at = now(), contact_consent = false where id = ${String(row.id)}
  `)
  return 'unsubscribed'
}
