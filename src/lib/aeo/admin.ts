import { and, asc, desc, eq, gte, isNotNull, isNull, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRequest, aeoResult, aeoRun } from '@/lib/db/schema'
import { workerConfig } from './config'
import type { LeadFilters, LeadStatus } from './lead-filters'
import { spentTodayUsd } from './queue'
import { newPublicId } from './tokens'

/** Data and mutations behind /dashboard/aeo. Callers must check the session first. */

const LEAD_LIMIT = 500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function listLeads(filters: LeadFilters) {
  const conditions: SQL[] = []
  if (filters.vertical === 'generated') conditions.push(isNull(aeoRequest.panelSlug))
  else if (filters.vertical) conditions.push(eq(aeoRequest.panelSlug, filters.vertical))
  if (filters.source) conditions.push(eq(aeoRequest.source, filters.source))
  if (filters.leadStatus) conditions.push(eq(aeoRequest.leadStatus, filters.leadStatus))
  if (filters.verified === true) conditions.push(isNotNull(aeoRequest.verifiedAt))
  if (filters.verified === false) conditions.push(isNull(aeoRequest.verifiedAt))
  // A score filter only matches finished runs.
  if (filters.minCited !== undefined) conditions.push(and(eq(aeoRun.status, 'done'), gte(aeoRun.citedCount, filters.minCited))!)
  if (filters.maxCited !== undefined) conditions.push(and(eq(aeoRun.status, 'done'), lte(aeoRun.citedCount, filters.maxCited))!)

  return db
    .select({
      requestId: aeoRequest.id,
      createdAt: aeoRequest.createdAt,
      businessName: aeoRequest.businessName,
      domain: aeoRequest.domain,
      service: aeoRequest.service,
      city: aeoRequest.city,
      state: aeoRequest.state,
      panelSlug: aeoRequest.panelSlug,
      panelName: aeoPanel.name,
      email: aeoRequest.email,
      contactConsent: aeoRequest.contactConsent,
      unsubscribedAt: aeoRequest.unsubscribedAt,
      anonymizedAt: aeoRequest.anonymizedAt,
      verifiedAt: aeoRequest.verifiedAt,
      leadStatus: aeoRequest.leadStatus,
      source: aeoRequest.source,
      runId: aeoRun.id,
      publicId: aeoRun.publicId,
      runStatus: aeoRun.status,
      runAttempts: aeoRun.attempts,
      panelSource: aeoRun.panelSource,
      questionCount: aeoRun.questionCount,
      citedCount: aeoRun.citedCount,
      costUsd: aeoRun.costUsd,
      bookingClicks: sql<number>`(select count(*) from aeo_booking_click c where c.run_id = ${aeoRun.id})::int`,
      reportViews: aeoRun.reportViewCount,
      reportFirstViewedAt: aeoRun.reportFirstViewedAt,
    })
    .from(aeoRequest)
    .leftJoin(aeoRun, eq(aeoRequest.runId, aeoRun.id))
    .leftJoin(aeoPanel, eq(aeoRequest.panelSlug, aeoPanel.slug))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(aeoRequest.createdAt))
    .limit(LEAD_LIMIT)
}

export type LeadRow = Awaited<ReturnType<typeof listLeads>>[number]

export async function dashboardStats() {
  const [spent, depth] = await Promise.all([
    spentTodayUsd(),
    db.execute(sql`
      select count(*) filter (where status = 'queued')::int as queued,
             count(*) filter (where status = 'running')::int as running
      from aeo_run where status in ('queued', 'running')
    `),
  ])
  const row = depth.rows[0] as { queued: number; running: number } | undefined
  return {
    spentTodayUsd: spent,
    dailyCapUsd: workerConfig().dailySpendCapUsd,
    queued: Number(row?.queued ?? 0),
    running: Number(row?.running ?? 0),
  }
}

export type FunnelStats = {
  days: number
  requested: number
  verified: number
  ready: number
  viewed: number
  clickedBook: number
  contacted: number
  won: number
}

/**
 * The public-form lead funnel for requests made in the last `days` days.
 * Outbound prospect snapshots are left out: they skip verification and aren't
 * inbound demand. Stages come from each request's run, so requests sharing a
 * reused run share its report views and booking clicks.
 */
export async function funnelStats(days = 30): Promise<FunnelStats> {
  const result = await db.execute(sql`
    select count(*)::int as requested,
           count(*) filter (where q.verified_at is not null)::int as verified,
           count(*) filter (where r.status = 'done')::int as ready,
           count(*) filter (where r.report_first_viewed_at is not null)::int as viewed,
           count(*) filter (where exists (select 1 from aeo_booking_click c where c.run_id = r.id))::int as clicked,
           count(*) filter (where q.lead_status in ('contacted', 'won'))::int as contacted,
           count(*) filter (where q.lead_status = 'won')::int as won
    from aeo_request q
    left join aeo_run r on r.id = q.run_id
    where q.created_at > now() - ${days}::int * interval '1 day'
      and q.source = 'form'
  `)
  const row = result.rows[0] as Record<string, unknown>
  return {
    days,
    requested: Number(row.requested),
    verified: Number(row.verified),
    ready: Number(row.ready),
    viewed: Number(row.viewed),
    clickedBook: Number(row.clicked),
    contacted: Number(row.contacted),
    won: Number(row.won),
  }
}

/** Verified requests without a canned panel, by stated service: candidates for a new canned panel. */
export async function generatedServiceCounts() {
  const result = await db.execute(sql`
    select lower(trim(service)) as service, count(*)::int as requests
    from aeo_request
    where panel_slug is null and verified_at is not null
    group by 1
    order by 2 desc, 1
    limit 10
  `)
  return (result.rows as { service: string; requests: number }[]).map((r) => ({
    service: String(r.service),
    requests: Number(r.requests),
  }))
}

export async function panelOptions() {
  return db.select({ slug: aeoPanel.slug, name: aeoPanel.name }).from(aeoPanel).orderBy(asc(aeoPanel.name))
}

export async function loadRunDetail(runId: string) {
  if (!UUID.test(runId)) return null

  const [run] = await db.select().from(aeoRun).where(eq(aeoRun.id, runId)).limit(1)
  if (!run) return null

  const [requests, results, panels, clicks, rechecks] = await Promise.all([
    db
      .select({
        id: aeoRequest.id,
        email: aeoRequest.email,
        businessName: aeoRequest.businessName,
        service: aeoRequest.service,
        city: aeoRequest.city,
        state: aeoRequest.state,
        contactConsent: aeoRequest.contactConsent,
        verifiedAt: aeoRequest.verifiedAt,
        ipAddress: aeoRequest.ipAddress,
        leadStatus: aeoRequest.leadStatus,
        source: aeoRequest.source,
        reportEmailedAt: aeoRequest.reportEmailedAt,
        createdAt: aeoRequest.createdAt,
      })
      .from(aeoRequest)
      .where(eq(aeoRequest.runId, run.id))
      .orderBy(asc(aeoRequest.createdAt)),
    db
      .select()
      .from(aeoResult)
      .where(eq(aeoResult.runId, run.id))
      .orderBy(asc(aeoResult.category), asc(aeoResult.query)),
    run.panelSlug
      ? db.select({ name: aeoPanel.name }).from(aeoPanel).where(eq(aeoPanel.slug, run.panelSlug)).limit(1)
      : Promise.resolve([] as { name: string }[]),
    db.execute(sql`
      select count(*)::int as clicks, max(created_at) as last
      from aeo_booking_click where run_id = ${run.id}
    `),
    db.execute(sql`
      select c.run_id, later.status, later.public_id, c.emailed_at
      from aeo_recheck c
      join aeo_run later on later.id = c.run_id
      where c.request_id in (select id from aeo_request where run_id = ${run.id})
      order by c.created_at desc
      limit 1
    `),
  ])

  const clickRow = clicks.rows[0] as { clicks: number; last: Date | string | null } | undefined
  const bookingClicks = {
    count: Number(clickRow?.clicks ?? 0),
    last: clickRow?.last ? new Date(clickRow.last) : null,
  }

  const recheckRow = rechecks.rows[0] as
    | { run_id: string; status: string; public_id: string; emailed_at: Date | string | null }
    | undefined
  const recheck = recheckRow
    ? {
        runId: String(recheckRow.run_id),
        status: String(recheckRow.status),
        publicId: String(recheckRow.public_id),
        emailedAt: recheckRow.emailed_at ? new Date(recheckRow.emailed_at) : null,
      }
    : null

  return { run, requests, results, panelName: panels[0]?.name ?? null, bookingClicks, recheck }
}

export async function setLeadStatus(requestId: string, status: LeadStatus): Promise<boolean> {
  const updated = await db
    .update(aeoRequest)
    .set({ leadStatus: status })
    .where(eq(aeoRequest.id, requestId))
    .returning({ id: aeoRequest.id })
  return updated.length === 1
}

/**
 * Delete a request, and its run when no other request still uses it (results
 * go with the run). For deletion requests under the privacy policy.
 */
export async function deleteRequest(requestId: string): Promise<{ found: boolean; runDeleted: boolean }> {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .delete(aeoRequest)
      .where(eq(aeoRequest.id, requestId))
      .returning({ runId: aeoRequest.runId })
    if (!request) return { found: false, runDeleted: false }
    if (!request.runId) return { found: true, runDeleted: false }

    const deleted = await tx.execute(sql`
      delete from aeo_run
      where id = ${request.runId}
        and not exists (select 1 from aeo_request where run_id = ${request.runId})
      returning id
    `)
    return { found: true, runDeleted: deleted.rows.length > 0 }
  })
}

/**
 * Start a fresh run for the same business, skipping the 30-day reuse and the
 * daily spend cap. The run's requests move to the new run, so their report
 * links show the new results. Requests already emailed aren't emailed again.
 * Generated questions are written fresh.
 */
export async function createRerun(runId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [run] = await tx.select().from(aeoRun).where(eq(aeoRun.id, runId)).limit(1)
    if (!run) return null

    const [next] = await tx
      .insert(aeoRun)
      .values({
        publicId: newPublicId(),
        domain: run.domain,
        otherDomains: run.otherDomains,
        tier: run.tier,
        engines: run.engines,
        panelSource: run.panelSource,
        panelSlug: run.panelSlug,
        bypassSpendCap: true,
      })
      .returning({ id: aeoRun.id })

    await tx.update(aeoRequest).set({ runId: next.id }).where(eq(aeoRequest.runId, run.id))
    return next.id
  })
}
