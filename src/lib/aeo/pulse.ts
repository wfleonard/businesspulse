import 'server-only'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRun, business, user } from '@/lib/db/schema'
import { PULSE_ENGINES } from './config'
import { newPublicId } from './tokens'

/**
 * Pulse runs from the admin side (docs/pulse-plan.md §4.3, §4.7): start a free
 * run for any client business, and see each run's progress, cost, and time.
 * Paid runs from Stripe arrive in P6 and use the same startPulseRun.
 */

export type StartResult = { ok: true; publicId: string } | { ok: false; error: string }

/** Queue a Pulse run for a business. Refused while one is already queued or running. */
export async function startPulseRun(businessId: string): Promise<StartResult> {
  return db.transaction(async (tx) => {
    const [owner] = await tx.select().from(business).where(eq(business.id, businessId)).for('update').limit(1)
    if (!owner) return { ok: false, error: 'That business no longer exists.' }
    if (!owner.panelSlug) {
      return { ok: false, error: `${owner.name} has no approved question set yet ("${owner.customIndustry}").` }
    }
    const [panel] = await tx
      .select({ slug: aeoPanel.slug })
      .from(aeoPanel)
      .where(and(eq(aeoPanel.slug, owner.panelSlug), eq(aeoPanel.isActive, true)))
      .limit(1)
    if (!panel) return { ok: false, error: `The ${owner.panelSlug} question set is switched off.` }

    const [active] = await tx
      .select({ id: aeoRun.id })
      .from(aeoRun)
      .where(and(eq(aeoRun.businessId, owner.id), inArray(aeoRun.status, ['queued', 'running'])))
      .limit(1)
    if (active) return { ok: false, error: `${owner.name} already has a Pulse run in progress.` }

    const [run] = await tx
      .insert(aeoRun)
      .values({
        publicId: newPublicId(),
        domain: owner.domain,
        otherDomains: owner.otherDomains,
        tier: 'pulse',
        engines: [...PULSE_ENGINES],
        panelSource: 'canned',
        panelSlug: owner.panelSlug,
        businessId: owner.id,
      })
      .returning({ publicId: aeoRun.publicId })
    return { ok: true, publicId: run.publicId }
  })
}

export type PulseBusiness = {
  id: string
  name: string
  domain: string
  panelSlug: string | null
  customIndustry: string
  ownerEmail: string
  runs: number
  activeRun: boolean
}

export async function listPulseBusinesses(): Promise<PulseBusiness[]> {
  return db
    .select({
      id: business.id,
      name: business.name,
      domain: business.domain,
      panelSlug: business.panelSlug,
      customIndustry: business.customIndustry,
      ownerEmail: user.email,
      runs: sql<number>`(select count(*) from aeo_run r where r.business_id = ${business.id})::int`,
      activeRun: sql<boolean>`exists (select 1 from aeo_run r where r.business_id = ${business.id} and r.status in ('queued', 'running'))`,
    })
    .from(business)
    .innerJoin(user, eq(user.id, business.userId))
    .orderBy(business.name)
}

export type PulseRunRow = {
  id: string
  publicId: string
  businessName: string
  domain: string
  status: 'queued' | 'running' | 'done' | 'failed'
  attempts: number
  questionCount: number
  citedCount: number
  costUsd: number
  error: string | null
  createdAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  /** Answers saved so far, per assistant. */
  answersByEngine: Record<string, number>
}

export async function listPulseRuns(limit = 25): Promise<PulseRunRow[]> {
  const runs = await db
    .select({
      id: aeoRun.id,
      publicId: aeoRun.publicId,
      businessName: business.name,
      domain: aeoRun.domain,
      status: aeoRun.status,
      attempts: aeoRun.attempts,
      questionCount: aeoRun.questionCount,
      citedCount: aeoRun.citedCount,
      costUsd: aeoRun.costUsd,
      error: aeoRun.error,
      createdAt: aeoRun.createdAt,
      startedAt: aeoRun.startedAt,
      finishedAt: aeoRun.finishedAt,
    })
    .from(aeoRun)
    .innerJoin(business, eq(business.id, aeoRun.businessId))
    .where(eq(aeoRun.tier, 'pulse'))
    .orderBy(desc(aeoRun.createdAt))
    .limit(limit)
  if (runs.length === 0) return []

  const counts = await db.execute<{ run_id: string; engine: string; answers: number }>(sql`
    select run_id, engine, count(*)::int as answers
    from aeo_result
    where error is null and run_id in (${sql.join(runs.map((r) => sql`${r.id}::uuid`), sql`, `)})
    group by run_id, engine
  `)
  const byRun = new Map<string, Record<string, number>>()
  for (const row of counts.rows) {
    const entry = byRun.get(row.run_id) ?? {}
    entry[row.engine] = Number(row.answers)
    byRun.set(row.run_id, entry)
  }

  return runs.map((run) => ({ ...run, costUsd: Number(run.costUsd), answersByEngine: byRun.get(run.id) ?? {} }))
}
