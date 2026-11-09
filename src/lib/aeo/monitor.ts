import { sql } from 'drizzle-orm'
import { pulseLaunchEmail } from '@/lib/access/emails'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/provider'
import { PUBLIC_ID } from './booking'

/**
 * The paid offer on snapshot reports. It started as the BusinessPulse Monitor
 * demand test ($49 a month, docs/monitor-tier-plan.md); Pulse replaced
 * Monitor before it opened (docs/pulse-plan.md), so the offer now leads to
 * the Pulse page. Clicks are still counted per report as "click" rows, and the
 * Monitor waitlist gets one email saying Pulse is open.
 */

/** The offer shows on reports unless AEO_MONITOR_OFFER is "false". */
export function monitorOfferEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AEO_MONITOR_OFFER?.trim().toLowerCase() !== 'false'
}

/**
 * Pulse is a BusinessPulse product, so only public-form reports offer it.
 * Outbound prospect snapshots are Saxon AEO outreach and never do.
 */
export function offersMonitor(requestSource: 'form' | 'outbound' | null, env?: Record<string, string | undefined>): boolean {
  return requestSource === 'form' && monitorOfferEnabled(env)
}

/** Record a click on the offer. Unknown or malformed IDs record nothing. */
export async function recordMonitorClick(publicId: string | null): Promise<boolean> {
  if (!publicId || !PUBLIC_ID.test(publicId)) return false
  const result = await db.execute(sql`
    insert into aeo_monitor_interest (run_id, kind)
    select id, 'click' from aeo_run where public_id = ${publicId}
    returning id
  `)
  return result.rows.length > 0
}

/* ------------------------- The waitlist email ------------------------- */

export type WaitlistRecipient = { interestId: string; email: string; domain: string }

/**
 * People on the Monitor waitlist who haven't had the launch email: the
 * address their snapshot went to, unless retention has erased it. One per
 * email address.
 */
export async function waitlistRecipients(): Promise<{ pending: WaitlistRecipient[]; notified: number; erased: number }> {
  const result = await db.execute<{ interest_id: string; email: string; domain: string; notified_at: Date | null; anonymized_at: Date | null }>(sql`
    select i.id as interest_id, i.notified_at, r.domain, req.email, req.anonymized_at
    from aeo_monitor_interest i
    join aeo_run r on r.id = i.run_id
    left join lateral (
      select q.email, q.anonymized_at from aeo_request q
      where q.source = 'form'
        and (q.run_id = r.id or exists (select 1 from aeo_recheck c where c.run_id = r.id and c.request_id = q.id))
      order by q.created_at
      limit 1
    ) req on true
    where i.kind = 'waitlist'
    order by i.created_at
  `)
  const pending: WaitlistRecipient[] = []
  const seen = new Set<string>()
  let notified = 0
  let erased = 0
  for (const row of result.rows) {
    if (row.notified_at) {
      notified++
      continue
    }
    if (!row.email || row.anonymized_at) {
      erased++
      continue
    }
    const email = row.email.trim().toLowerCase()
    if (seen.has(email)) continue
    seen.add(email)
    pending.push({ interestId: row.interest_id, email, domain: row.domain })
  }
  return { pending, notified, erased }
}

/**
 * Send the one launch email to everyone still waiting. Each row is marked
 * when its email goes out, so pressing the button again never repeats one.
 */
export async function emailWaitlist(send: typeof sendEmail = sendEmail): Promise<{ sent: number; failed: number }> {
  const { pending } = await waitlistRecipients()
  let sent = 0
  let failed = 0
  for (const recipient of pending) {
    const result = await send({ to: recipient.email, ...pulseLaunchEmail({ domain: recipient.domain }) }).catch(() => ({ sent: false }))
    if (!result.sent) {
      failed++
      continue
    }
    sent++
    // Every waitlist row for this address, so a business that joined twice gets one email.
    await db.execute(sql`
      update aeo_monitor_interest i set notified_at = now()
      from aeo_run r, aeo_request q
      where i.kind = 'waitlist' and i.notified_at is null and r.id = i.run_id
        and q.source = 'form' and lower(q.email) = ${recipient.email}
        and (q.run_id = r.id or exists (select 1 from aeo_recheck c where c.run_id = r.id and c.request_id = q.id))
    `)
    await db.execute(sql`update aeo_monitor_interest set notified_at = now() where id = ${recipient.interestId}::uuid and notified_at is null`)
  }
  return { sent, failed }
}
