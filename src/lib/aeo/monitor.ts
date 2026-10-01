import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { PUBLIC_ID } from './booking'

/**
 * BusinessPulse Monitor demand test (docs/monitor-tier-plan.md, M0).
 *
 * Snapshot reports offer Monitor at its planned price. The offer leads to a
 * page that says plainly it isn't open yet and takes a one-click waitlist
 * sign-up, using the email the report already went to. Clicks and sign-ups
 * are counted per report, so the dashboard shows whether anyone wants it
 * before any payments work is built. Nothing is charged.
 */

export const MONITOR_PRICE_USD = 49
export const MONITOR_QUESTIONS = 50

/** The offer shows on reports unless AEO_MONITOR_OFFER is "false". */
export function monitorOfferEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AEO_MONITOR_OFFER?.trim().toLowerCase() !== 'false'
}

/**
 * Monitor is a BusinessPulse product, so only public-form reports offer it.
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

export type MonitorPageState =
  | { kind: 'none' }
  | { kind: 'erased'; domain: string }
  | { kind: 'open'; domain: string }
  | { kind: 'joined'; domain: string }

/*
 * The public-form request a report belongs to and can still reach: either the
 * request that started the run, or the one a 30-day re-check was run for.
 * Its email is what a waitlist sign-up will use.
 */
const REACHABLE_REQUEST = sql`
  select q.id, q.anonymized_at
  from aeo_request q
  where q.source = 'form'
    and (q.run_id = r.id or exists (select 1 from aeo_recheck c where c.run_id = r.id and c.request_id = q.id))
  order by q.created_at
  limit 1
`

/** What the Monitor page should show for a report link. */
export async function monitorPageState(publicId: string | null): Promise<MonitorPageState> {
  if (!publicId || !PUBLIC_ID.test(publicId)) return { kind: 'none' }
  const result = await db.execute(sql`
    select r.domain,
           req.id as request_id,
           req.anonymized_at,
           exists (select 1 from aeo_monitor_interest i where i.run_id = r.id and i.kind = 'waitlist') as joined
    from aeo_run r
    left join lateral (${REACHABLE_REQUEST}) req on true
    where r.public_id = ${publicId}
  `)
  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row || !row.request_id) return { kind: 'none' }
  const domain = String(row.domain)
  if (row.joined) return { kind: 'joined', domain }
  if (row.anonymized_at) return { kind: 'erased', domain }
  return { kind: 'open', domain }
}

/** Put a report's business on the waitlist. True if it is on the list afterwards. */
export async function joinMonitorWaitlist(publicId: string): Promise<boolean> {
  const state = await monitorPageState(publicId)
  if (state.kind === 'joined') return true
  if (state.kind !== 'open') return false
  await db.execute(sql`
    insert into aeo_monitor_interest (run_id, kind)
    select id, 'waitlist' from aeo_run where public_id = ${publicId}
    on conflict do nothing
  `)
  return true
}
