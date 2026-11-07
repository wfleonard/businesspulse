import { and, eq, sql } from 'drizzle-orm'
import { briefReadyEmail } from '@/lib/access/emails'
import { db } from '@/lib/db'
import { aeoPanel, business, businessBrief, user } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/provider'
import { BriefError, writeBrief, type BriefCall } from './brief'
import { crawlSite, type CrawlResult } from './crawl'
import { stateInfo } from './states'

/**
 * Site deep dives as worker jobs (docs/business-panel-plan.md §4). A business
 * has one brief row; queueing a read resets it, and the Pulse worker claims it
 * with a lease, the way it claims runs.
 */

/** Re-reads of one business's site are limited to one a day, unless an admin forces it. */
export const BRIEF_REREAD_HOURS = 24
const MAX_BRIEF_ATTEMPTS = 2
const BRIEF_LEASE_SECONDS = 600

export type QueueResult = 'queued' | 'in_progress' | 'too_soon'

export async function queueBrief(businessId: string, options: { force?: boolean } = {}): Promise<QueueResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ status: businessBrief.status, requestedAt: businessBrief.requestedAt })
      .from(businessBrief)
      .where(eq(businessBrief.businessId, businessId))
      .for('update')
      .limit(1)

    if (!existing) {
      await tx.insert(businessBrief).values({ businessId })
      return 'queued'
    }
    if (existing.status === 'queued' || existing.status === 'reading') return 'in_progress'
    const ageHours = (Date.now() - existing.requestedAt.getTime()) / 3_600_000
    if (!options.force && ageHours < BRIEF_REREAD_HOURS) return 'too_soon'

    await tx
      .update(businessBrief)
      .set({ status: 'queued', attempts: 0, error: null, lockedAt: null, leaseToken: null, requestedAt: new Date(), updatedAt: new Date() })
      .where(eq(businessBrief.businessId, businessId))
    return 'queued'
  })
}

/** Brief spend since midnight UTC, for the daily cap. */
export async function briefSpentTodayUsd(): Promise<number> {
  const result = await db.execute<{ spent: number }>(sql`
    select coalesce(sum(cost_usd), 0)::float8 as spent from business_brief
    where updated_at >= date_trunc('day', now())
  `)
  return Number(result.rows[0]?.spent ?? 0)
}

export type ClaimedBrief = { id: string; businessId: string; attempts: number; leaseToken: string }

export async function claimNextBrief(): Promise<ClaimedBrief | null> {
  const result = await db.execute<{ id: string; business_id: string; attempts: number; lease_token: string }>(sql`
    update business_brief
    set status = 'reading', attempts = attempts + 1, locked_at = now(), lease_token = gen_random_uuid(), updated_at = now()
    where id = (
      select id from business_brief
      where attempts < ${MAX_BRIEF_ATTEMPTS}::int
        and (status = 'queued'
          or (status = 'reading' and locked_at < now() - ${BRIEF_LEASE_SECONDS}::int * interval '1 second'))
      order by requested_at
      for update skip locked
      limit 1
    )
    returning id, business_id, attempts, lease_token
  `)
  const row = result.rows[0]
  return row ? { id: row.id, businessId: row.business_id, attempts: Number(row.attempts), leaseToken: row.lease_token } : null
}

/** Briefs stuck reading after their last attempt (the worker died): mark them failed. */
export async function sweepAbandonedBriefs(): Promise<number> {
  const result = await db.execute(sql`
    update business_brief
    set status = 'failed', error = 'the worker stopped responding', lease_token = null, locked_at = null, updated_at = now()
    where status = 'reading' and attempts >= ${MAX_BRIEF_ATTEMPTS}::int
      and locked_at < now() - ${BRIEF_LEASE_SECONDS}::int * interval '1 second'
    returning id
  `)
  return result.rows.length
}

export type BriefJobOptions = {
  model: string
  /** Tests only. */
  crawl?: (domain: string, otherDomains: string[]) => Promise<CrawlResult>
  /** Tests only. */
  call?: BriefCall
  /** Tests only. */
  send?: typeof sendEmail
}

export type BriefJobOutcome = { status: 'ready' | 'queued' | 'failed' | 'lost'; costUsd: number; pages: number; error?: string }

/** Read the site, write the brief, store it, and ask the client to confirm it. */
export async function processBrief(job: ClaimedBrief, options: BriefJobOptions): Promise<BriefJobOutcome> {
  const [owner] = await db
    .select({ business, userName: user.name, userEmail: user.email })
    .from(business)
    .innerJoin(user, eq(user.id, business.userId))
    .where(eq(business.id, job.businessId))
    .limit(1)
  if (!owner) return { status: 'lost', costUsd: 0, pages: 0 }
  const biz = owner.business

  const panels = await db
    .select({ slug: aeoPanel.slug, name: aeoPanel.name })
    .from(aeoPanel)
    .where(eq(aeoPanel.isActive, true))
    .orderBy(aeoPanel.name)

  let crawl: CrawlResult = { pages: [], source: 'homepage', skipped: [] }
  let crawlError: string | null = null
  try {
    crawl = await (options.crawl ?? ((d, o) => crawlSite(d, o)))(biz.domain, biz.otherDomains)
  } catch (err) {
    // An unreadable site still gets a brief, from the profile alone, flagged for the admin.
    crawlError = err instanceof Error ? err.message : String(err)
  }

  const industry = biz.panelSlug
    ? (panels.find((p) => p.slug === biz.panelSlug)?.name ?? biz.panelSlug)
    : `Something else: ${biz.customIndustry}`

  try {
    const brief = await writeBrief(
      {
        businessName: biz.name,
        domain: biz.domain,
        service: biz.service,
        city: biz.city,
        stateName: stateInfo(biz.state)?.name ?? biz.state,
        industry,
        panels,
        pages: crawl.pages,
      },
      { model: options.model, call: options.call }
    )
    const stored = await db
      .update(businessBrief)
      .set({
        status: 'ready',
        brief,
        pages: crawl.pages.map((p) => ({ url: p.url, title: p.title })),
        crawlSource: crawlError ? `unreadable: ${crawlError}`.slice(0, 500) : crawl.source,
        confirmed: null,
        confirmedAt: null,
        costUsd: sql`${businessBrief.costUsd} + ${brief.costUsd}::numeric`,
        error: null,
        lockedAt: null,
        leaseToken: null,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(businessBrief.id, job.id), eq(businessBrief.leaseToken, job.leaseToken)))
      .returning({ id: businessBrief.id })
    if (stored.length === 0) return { status: 'lost', costUsd: brief.costUsd, pages: crawl.pages.length }

    try {
      await (options.send ?? sendEmail)({
        to: owner.userEmail,
        ...briefReadyEmail({ name: owner.userName, businessName: biz.name }),
      })
    } catch {
      // The account page shows the brief either way.
    }
    return { status: 'ready', costUsd: brief.costUsd, pages: crawl.pages.length }
  } catch (err) {
    const costUsd = err instanceof BriefError ? err.costUsd : 0
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000)
    const final = job.attempts >= MAX_BRIEF_ATTEMPTS
    await db
      .update(businessBrief)
      .set({
        status: final ? 'failed' : 'queued',
        costUsd: sql`${businessBrief.costUsd} + ${costUsd}::numeric`,
        error: message,
        lockedAt: null,
        leaseToken: null,
        updatedAt: new Date(),
      })
      .where(and(eq(businessBrief.id, job.id), eq(businessBrief.leaseToken, job.leaseToken)))
    return { status: final ? 'failed' : 'queued', costUsd, pages: crawl.pages.length, error: message }
  }
}
