import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

/**
 * Retention: the contact details someone gave us (email, business name, IP
 * address) are erased once the request is older than the retention period,
 * as the privacy page promises.
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
  return result.rows.length
}
