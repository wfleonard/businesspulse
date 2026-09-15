import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoResult } from '@/lib/db/schema'
import type { PanelResult } from './job'

/**
 * Postgres is the AEO job queue. Valkey runs without persistence, so a queue
 * there would lose every waiting run on a restart or deploy.
 *
 * Lifecycle of a run:
 *   queued  → claimed (status running, attempts + 1, new lease token)
 *   running → heartbeat refreshes locked_at while the panel runs
 *   running → done       results stored in one transaction
 *   running → queued     failed attempt, retried after attempts × retry delay
 *   running → failed     permanent error, or the last attempt failed
 *   running → reclaimed  heartbeat stopped for longer than the lease
 */

export class LeaseLostError extends Error {
  constructor(runId: string) {
    super(`lease on run ${runId} was lost to another worker`)
    this.name = 'LeaseLostError'
  }
}

export type ClaimedRun = {
  id: string
  publicId: string
  domain: string
  tier: 'snapshot' | 'full'
  engines: string[]
  panelSource: 'canned' | 'generated'
  panelSlug: string | null
  attempts: number
  leaseToken: string
}

type Row = Record<string, unknown>

/** Spend on runs started since midnight UTC. */
export async function spentTodayUsd(): Promise<number> {
  const result = await db.execute(sql`
    select coalesce(sum(cost_usd), 0)::float8 as spent
    from aeo_run
    where started_at >= date_trunc('day', now())
  `)
  return Number((result.rows[0] as Row | undefined)?.spent ?? 0)
}

/**
 * Claim the oldest runnable run, or null.
 *
 * Runnable means: queued and past its retry delay, or running with a heartbeat
 * older than the lease (its worker died). SKIP LOCKED lets several workers poll
 * the same table without ever claiming the same run.
 */
export async function claimNextRun(options: {
  leaseSeconds: number
  retryDelaySeconds: number
  maxAttempts: number
  /** Over the daily spend cap: claim only admin re-runs, which bypass it. */
  onlyBypassSpendCap?: boolean
}): Promise<ClaimedRun | null> {
  const { leaseSeconds, retryDelaySeconds, maxAttempts } = options
  const onlyBypass = options.onlyBypassSpendCap ?? false
  const result = await db.execute(sql`
    update aeo_run
    set status = 'running',
        attempts = attempts + 1,
        locked_at = now(),
        lease_token = gen_random_uuid(),
        started_at = coalesce(started_at, now())
    where id = (
      select id from aeo_run
      where attempts < ${maxAttempts}::int
        and (${onlyBypass}::boolean = false or bypass_spend_cap)
        and (
          (status = 'queued'
            and (locked_at is null
              or locked_at < now() - (attempts * ${retryDelaySeconds}::int) * interval '1 second'))
          or (status = 'running'
            and locked_at < now() - ${leaseSeconds}::int * interval '1 second')
        )
      order by created_at
      for update skip locked
      limit 1
    )
    returning id, public_id, domain, tier, engines, panel_source, panel_slug, attempts, lease_token
  `)

  const row = result.rows[0] as Row | undefined
  if (!row) return null
  return {
    id: String(row.id),
    publicId: String(row.public_id),
    domain: String(row.domain),
    tier: row.tier as ClaimedRun['tier'],
    engines: row.engines as string[],
    panelSource: row.panel_source as ClaimedRun['panelSource'],
    panelSlug: (row.panel_slug as string | null) ?? null,
    attempts: Number(row.attempts),
    leaseToken: String(row.lease_token),
  }
}

/** Refresh the lease. Returns false if another worker has taken the run. */
export async function heartbeat(run: ClaimedRun): Promise<boolean> {
  const result = await db.execute(sql`
    update aeo_run set locked_at = now()
    where id = ${run.id} and lease_token = ${run.leaseToken} and status = 'running'
    returning id
  `)
  return result.rows.length === 1
}

/**
 * Fail runs whose worker died on their final attempt. They are past the lease
 * but can't be reclaimed, so without this they would sit in `running` forever.
 */
export async function sweepAbandoned(options: {
  leaseSeconds: number
  maxAttempts: number
}): Promise<string[]> {
  const result = await db.execute(sql`
    update aeo_run
    set status = 'failed',
        error = 'worker stopped responding on attempt ' || attempts,
        lease_token = null,
        locked_at = null,
        finished_at = now()
    where status = 'running'
      and attempts >= ${options.maxAttempts}::int
      and locked_at < now() - ${options.leaseSeconds}::int * interval '1 second'
    returning id
  `)
  return (result.rows as Row[]).map((row) => String(row.id))
}

export type PanelResultRow = PanelResult['results'][number]

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function lockRun(tx: Tx, run: ClaimedRun): Promise<void> {
  const locked = await tx.execute(sql`
    select id from aeo_run
    where id = ${run.id} and lease_token = ${run.leaseToken} and status = 'running'
    for update
  `)
  if (locked.rows.length === 0) throw new LeaseLostError(run.id)
}

/**
 * Replace a run's errored rows, and rows for questions no longer in its plan,
 * with this attempt's rows. Answers saved by earlier attempts stay.
 */
async function replaceRows(tx: Tx, runId: string, rows: PanelResultRow[], planQueries: string[]): Promise<void> {
  const inPlan = planQueries.length
    ? sql`query in (${sql.join(planQueries.map((q) => sql`${q}`), sql`, `)})`
    : sql`false`
  await tx.execute(sql`delete from aeo_result where run_id = ${runId} and (error is not null or not ${inPlan})`)

  if (rows.length === 0) return
  await tx.insert(aeoResult).values(
    rows.map((row) => ({
      runId,
      category: row.category,
      query: row.query,
      engine: row.engine,
      model: row.model,
      ownCited: row.own_cited,
      nameMentioned: row.name_mentioned,
      directoryOnly: row.directory_only,
      ownRank: row.own_rank,
      rivals: row.rivals,
      sources: row.sources,
      answer: row.answer,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      searches: row.searches,
      costUsd: String(row.cost_usd),
      error: row.error,
    }))
  )
}

/** Questions this run already has answers for, from earlier attempts. */
export async function answeredQueries(runId: string): Promise<Set<string>> {
  const result = await db.execute(sql`
    select distinct query from aeo_result where run_id = ${runId} and error is null
  `)
  return new Set((result.rows as Row[]).map((row) => String(row.query)))
}

/**
 * Keep this attempt's answers (and its cost) before the run goes back to the
 * queue, so the next attempt only asks the questions still missing.
 */
export async function saveProgress(
  run: ClaimedRun,
  rows: PanelResultRow[],
  costUsd: number,
  planQueries: string[]
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockRun(tx, run)
    await replaceRows(tx, run.id, rows.filter((row) => !row.error), planQueries)
    await tx.execute(sql`update aeo_run set cost_usd = cost_usd + ${costUsd}::numeric where id = ${run.id}`)
  })
}

/**
 * Store this attempt's rows and mark the run done, atomically.
 *
 * Answers from earlier attempts are kept; errored rows are replaced. Totals are
 * counted from what's stored, so they cover every attempt, and count only
 * answered questions: a question AI search never answered isn't a miss. Cost is
 * added, not replaced, because earlier attempts' spend was real.
 */
export async function completeRun(
  run: ClaimedRun,
  rows: PanelResultRow[],
  costUsd: number,
  options: { panelVersion: number | null; planQueries: string[] }
): Promise<{ questionCount: number; citedCount: number }> {
  return db.transaction(async (tx) => {
    await lockRun(tx, run)
    await replaceRows(tx, run.id, rows, options.planQueries)

    const counted = await tx.execute(sql`
      select count(distinct query) filter (where error is null)::int as answered,
             count(distinct query) filter (where error is null and own_cited)::int as cited
      from aeo_result where run_id = ${run.id}
    `)
    const totals = counted.rows[0] as Row
    const questionCount = Number(totals.answered)
    const citedCount = Number(totals.cited)

    await tx.execute(sql`
      update aeo_run
      set status = 'done',
          question_count = ${questionCount}::int,
          cited_count = ${citedCount}::int,
          cost_usd = cost_usd + ${costUsd}::numeric,
          panel_version = ${options.panelVersion}::int,
          error = null,
          lease_token = null,
          locked_at = null,
          finished_at = now()
      where id = ${run.id}
    `)

    return { questionCount, citedCount }
  })
}

/**
 * Record a failed attempt. The run goes back to the queue unless the failure is
 * permanent or this was the last attempt. Returns the new status, or null if the
 * lease had already been lost.
 */
export async function failAttempt(
  run: ClaimedRun,
  message: string,
  options: { permanent?: boolean; costUsd?: number; maxAttempts: number }
): Promise<'queued' | 'failed' | null> {
  const permanent = options.permanent ?? false
  const result = await db.execute(sql`
    update aeo_run
    set status = (case when ${permanent}::boolean or attempts >= ${options.maxAttempts}::int
                       then 'failed' else 'queued' end)::aeo_run_status,
        error = ${message.slice(0, 2000)},
        cost_usd = cost_usd + ${options.costUsd ?? 0}::numeric,
        lease_token = null,
        locked_at = now(),
        finished_at = case when ${permanent}::boolean or attempts >= ${options.maxAttempts}::int
                           then now() else null end
    where id = ${run.id} and lease_token = ${run.leaseToken}
    returning status
  `)
  const row = result.rows[0] as Row | undefined
  return row ? (row.status as 'queued' | 'failed') : null
}

/**
 * Give a run back on graceful shutdown. The attempt is refunded — being
 * interrupted by a deploy is not the run's failure.
 */
export async function releaseRun(run: ClaimedRun): Promise<void> {
  await db.execute(sql`
    update aeo_run
    set status = 'queued',
        attempts = greatest(attempts - 1, 0),
        lease_token = null,
        locked_at = null
    where id = ${run.id} and lease_token = ${run.leaseToken}
  `)
}
