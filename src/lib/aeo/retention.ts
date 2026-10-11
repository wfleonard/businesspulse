import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

/**
 * Retention: the contact details someone gave us (email, business name, IP
 * address) are erased once the request is older than the retention period,
 * as the privacy page promises.
 *
 * Copies of follow-up emails sent to the lead are blanked at the same time.
 *
 * The run and its answers stay, without anything naming a person, so reports
 * keep working and industry benchmarks keep their data. Leads marked "won"
 * are skipped: a client is a business record, not a stale enquiry. Deletion
 * on request is separate and removes everything (see deleteRequest).
 */

/** Erase contact details past the retention period. Returns how many requests were cleared. */
export async function sweepExpiredContactDetails(retentionDays: number): Promise<number> {
  const result = await db.execute(sql`
    update aeo_request
    set email = '',
        business_name = '',
        ip_address = null,
        contact_consent = false,
        anonymized_at = now()
    where anonymized_at is null
      and lead_status <> 'won'
      and created_at < now() - ${retentionDays}::int * interval '1 day'
    returning id
  `)
  // Follow-up emails hold the address and a merged copy naming the business. Catches up on
  // anything anonymized before this ran, so it isn't tied to this sweep's rows.
  await db.execute(sql`
    update aeo_mail_send s
    set to_email = '', subject = '', body = ''
    from aeo_request q
    where q.id = s.request_id and q.anonymized_at is not null and s.to_email <> ''
  `)
  return result.rows.length
}
