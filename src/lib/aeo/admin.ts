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
      verifiedAt: aeoRequest.verifiedAt,
      leadStatus: aeoRequest.leadStatus,
      runId: aeoRun.id,
      publicId: aeoRun.publicId,
      runStatus: aeoRun.status,
      panelSource: aeoRun.panelSource,
      questionCount: aeoRun.questionCount,
      citedCount: aeoRun.citedCount,
      costUsd: aeoRun.costUsd,
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

  const [requests, results, panels] = await Promise.all([
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
  ])

  return { run, requests, results, panelName: panels[0]?.name ?? null }
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
