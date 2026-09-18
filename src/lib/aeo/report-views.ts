import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

/**
 * Report views for the lead funnel, kept in our own database so report links
 * never go to an analytics provider.
 *
 * The finished report page sends a ping from the browser. Email security
 * scanners that open links usually don't run scripts, so they rarely count.
 */

const REPORT_ID = /^[A-Za-z0-9_-]{24}$/

export function isReportId(value: unknown): value is string {
  return typeof value === 'string' && REPORT_ID.test(value)
}

const BOT_AGENT = /bot|crawl|spider|slurp|preview|scan|monitor|curl|wget|python|httpclient|headless|lighthouse/i

/** No user agent, or one that names itself a crawler, scanner, or script. */
export function isLikelyBot(userAgent: string | null): boolean {
  return !userAgent || BOT_AGENT.test(userAgent)
}

/** Count a view of a finished report. Views of queued, running, or failed runs don't count. */
export async function recordReportView(publicId: string): Promise<boolean> {
  const result = await db.execute(sql`
    update aeo_run
    set report_view_count = report_view_count + 1,
        report_first_viewed_at = coalesce(report_first_viewed_at, now()),
        report_last_viewed_at = now()
    where public_id = ${publicId} and status = 'done'
    returning id
  `)
  return result.rows.length > 0
}
