import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { pulseReportReadyEmail } from '@/lib/access/emails'
import { db } from '@/lib/db'
import { aeoResult, aeoRun, business, businessBrief, businessPanel, pulseReport, user } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/provider'
import { FixError, writeFixes, type FixCall } from './fixes'
import { buildPulseReport, buildTrend, type PulseResultInput } from './pulse-report'
import { checkSite, type SiteCheck } from './site-checks'

/**
 * Loading a Pulse report, and writing its "What to fix" after a run. Callers
 * decide who may see it: the client's page checks the run belongs to the
 * signed-in user's business before calling loadPulseReport.
 */

const MAX_REPORT_ATTEMPTS = 2
const REPORT_LEASE_SECONDS = 900

async function resultsFor(runId: string): Promise<PulseResultInput[]> {
  const rows = await db
    .select({
      engine: aeoResult.engine,
      category: aeoResult.category,
      query: aeoResult.query,
      ownCited: aeoResult.ownCited,
      nameMentioned: aeoResult.nameMentioned,
      directoryOnly: aeoResult.directoryOnly,
      rivals: aeoResult.rivals,
      sources: aeoResult.sources,
      answer: aeoResult.answer,
      searches: aeoResult.searches,
      error: aeoResult.error,
    })
    .from(aeoResult)
    .where(eq(aeoResult.runId, runId))
  return rows
}

/** A seller ships to buyers; a service business goes to them. It changes how question types read. */
export function isSeller(scope: string | undefined, sellsOnline: boolean, visitsCustomers: boolean): boolean {
  return scope === 'national' || scope === 'international' || (sellsOnline && !visitsCustomers)
}

/** A finished Pulse run, with everything its report page shows. Null if it isn't a finished Pulse run. */
export async function loadPulseReport(runId: string) {
  const [row] = await db
    .select({ run: aeoRun, business, brief: businessBrief, panel: businessPanel, report: pulseReport })
    .from(aeoRun)
    .innerJoin(business, eq(business.id, aeoRun.businessId))
    .leftJoin(businessBrief, eq(businessBrief.businessId, business.id))
    .leftJoin(businessPanel, eq(businessPanel.id, aeoRun.businessPanelId))
    .leftJoin(pulseReport, eq(pulseReport.runId, aeoRun.id))
    .where(and(eq(aeoRun.id, runId), eq(aeoRun.tier, 'pulse')))
    .limit(1)
  if (!row || row.run.status !== 'done') return null

  const area = row.brief?.brief?.serviceArea
  const seller = isSeller(row.brief?.confirmed?.scope ?? area?.scope, area?.sellsOnline ?? false, area?.visitsCustomers ?? false)
  const offerings = new Map((row.panel?.questions ?? []).map((q) => [q.q, q.offering]))
  const directoryDomains = row.panel?.directoryDomains ?? []
  const summary = buildPulseReport(await resultsFor(runId), { offerings, directoryDomains, seller })

  // The business's previous finished Pulse run, for the trend.
  const [previous] = await db
    .select({ id: aeoRun.id, createdAt: aeoRun.createdAt, businessPanelId: aeoRun.businessPanelId })
    .from(aeoRun)
    .where(
      and(
        eq(aeoRun.businessId, row.business.id),
        eq(aeoRun.tier, 'pulse'),
        eq(aeoRun.status, 'done'),
        lt(aeoRun.createdAt, row.run.createdAt)
      )
    )
    .orderBy(desc(aeoRun.createdAt))
    .limit(1)
  const trend = previous
    ? buildTrend(summary, buildPulseReport(await resultsFor(previous.id), { offerings, directoryDomains, seller }), {
        previousDate: previous.createdAt,
        samePanel: Boolean(previous.businessPanelId) && previous.businessPanelId === row.run.businessPanelId,
      })
    : null

  return {
    run: row.run,
    business: row.business,
    panelVersion: row.panel?.version ?? null,
    seller,
    summary,
    trend,
    checks: (row.report?.checks ?? []) as SiteCheck[],
    fixes: row.report?.fixes ?? [],
    reportStatus: row.report?.status ?? null,
  }
}

export type LoadedPulseReport = NonNullable<Awaited<ReturnType<typeof loadPulseReport>>>

/** The Pulse runs a business owns, newest first, for its account. */
export async function pulseRunsFor(businessId: string) {
  return db
    .select({ id: aeoRun.id, publicId: aeoRun.publicId, status: aeoRun.status, questionCount: aeoRun.questionCount, citedCount: aeoRun.citedCount, createdAt: aeoRun.createdAt })
    .from(aeoRun)
    .where(and(eq(aeoRun.businessId, businessId), eq(aeoRun.tier, 'pulse')))
    .orderBy(desc(aeoRun.createdAt))
}

/* ----------------------------- Jobs ------------------------------- */

/** Queue (or re-queue) the "What to fix" write-up for a finished run. */
export async function queuePulseReport(runId: string): Promise<void> {
  await db
    .insert(pulseReport)
    .values({ runId })
    .onConflictDoUpdate({
      target: pulseReport.runId,
      set: { status: 'queued', attempts: 0, error: null, lockedAt: null, leaseToken: null, updatedAt: new Date() },
    })
}

export type ClaimedReport = { id: string; runId: string; attempts: number; leaseToken: string }

export async function claimNextPulseReport(): Promise<ClaimedReport | null> {
  const result = await db.execute<{ id: string; run_id: string; attempts: number; lease_token: string }>(sql`
    update pulse_report
    set status = 'writing', attempts = attempts + 1, locked_at = now(), lease_token = gen_random_uuid(), updated_at = now()
    where id = (
      select id from pulse_report
      where attempts < ${MAX_REPORT_ATTEMPTS}::int
        and (status = 'queued'
          or (status = 'writing' and locked_at < now() - ${REPORT_LEASE_SECONDS}::int * interval '1 second'))
      order by created_at
      for update skip locked
      limit 1
    )
    returning id, run_id, attempts, lease_token
  `)
  const row = result.rows[0]
  return row ? { id: row.id, runId: row.run_id, attempts: Number(row.attempts), leaseToken: row.lease_token } : null
}

export type ReportJobOutcome = { status: 'ready' | 'queued' | 'failed' | 'lost'; costUsd: number; fixes: number; checks: number; error?: string }

/** Check the live site, write the fixes, store them, and tell the client their report is ready. */
export async function processPulseReport(
  job: ClaimedReport,
  options: { model: string; call?: FixCall; checkSite?: typeof checkSite; send?: typeof sendEmail }
): Promise<ReportJobOutcome> {
  const loaded = await loadPulseReport(job.runId)
  if (!loaded) return finish(job, { status: 'failed', error: 'the run is not a finished Pulse run' })
  const [extra] = await db
    .select({ brief: businessBrief, email: user.email, name: user.name })
    .from(business)
    .innerJoin(user, eq(user.id, business.userId))
    .leftJoin(businessBrief, eq(businessBrief.businessId, business.id))
    .where(eq(business.id, loaded.business.id))
    .limit(1)
  const brief = extra?.brief?.brief
  const confirmed = extra?.brief?.confirmed

  let checks: SiteCheck[] = []
  try {
    checks = await (options.checkSite ?? checkSite)({
      domain: loaded.business.domain,
      otherDomains: loaded.business.otherDomains,
      pageUrls: (extra?.brief?.pages ?? []).map((p) => p.url),
      places: confirmed?.places ?? brief?.serviceArea.places ?? [],
      scope: confirmed?.scope ?? brief?.serviceArea.scope ?? 'local',
      sellsProducts: loaded.seller,
    })
  } catch {
    // An unreachable site still gets fixes from the answers alone.
  }

  try {
    const written = await writeFixes(
      {
        businessName: loaded.business.name,
        domain: loaded.business.domain,
        summary: brief?.summary ?? '',
        offerings: confirmed?.offerings ?? [],
        scope: confirmed?.scope ?? brief?.serviceArea.scope ?? 'unknown',
        report: loaded.summary,
        checks,
        pages: extra?.brief?.pages ?? [],
      },
      { model: options.model, call: options.call }
    )
    const stored = await db
      .update(pulseReport)
      .set({
        status: 'ready',
        checks,
        fixes: written.fixes,
        model: written.model,
        costUsd: sql`${pulseReport.costUsd} + ${written.costUsd}::numeric`,
        error: null,
        lockedAt: null,
        leaseToken: null,
        updatedAt: new Date(),
      })
      .where(and(eq(pulseReport.id, job.id), eq(pulseReport.leaseToken, job.leaseToken)))
      .returning({ emailedAt: pulseReport.emailedAt })
    if (stored.length === 0) return { status: 'lost', costUsd: written.costUsd, fixes: written.fixes.length, checks: checks.length }

    if (!stored[0].emailedAt && extra) {
      try {
        const result = await (options.send ?? sendEmail)({
          to: extra.email,
          ...pulseReportReadyEmail({ name: extra.name, businessName: loaded.business.name, publicId: loaded.run.publicId, cited: loaded.summary.citedCount, questions: loaded.summary.answeredCount }),
        })
        if (result.sent) await db.update(pulseReport).set({ emailedAt: new Date() }).where(eq(pulseReport.id, job.id))
      } catch {
        // The report is in their account either way.
      }
    }
    return { status: 'ready', costUsd: written.costUsd, fixes: written.fixes.length, checks: checks.length }
  } catch (err) {
    const costUsd = err instanceof FixError ? err.costUsd : 0
    const final = job.attempts >= MAX_REPORT_ATTEMPTS
    return finish(job, { status: final ? 'failed' : 'queued', error: err instanceof Error ? err.message : String(err), costUsd, checks })
  }
}

async function finish(
  job: ClaimedReport,
  outcome: { status: 'failed' | 'queued'; error: string; costUsd?: number; checks?: SiteCheck[] }
): Promise<ReportJobOutcome> {
  await db
    .update(pulseReport)
    .set({
      status: outcome.status,
      error: outcome.error.slice(0, 1000),
      ...(outcome.checks?.length ? { checks: outcome.checks } : {}),
      costUsd: sql`${pulseReport.costUsd} + ${outcome.costUsd ?? 0}::numeric`,
      lockedAt: null,
      leaseToken: null,
      updatedAt: new Date(),
    })
    .where(and(eq(pulseReport.id, job.id), eq(pulseReport.leaseToken, job.leaseToken)))
  return { status: outcome.status, costUsd: outcome.costUsd ?? 0, fixes: 0, checks: outcome.checks?.length ?? 0, error: outcome.error }
}
