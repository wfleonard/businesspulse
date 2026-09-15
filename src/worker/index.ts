/**
 * AEO snapshot worker.
 *
 * Claims queued runs from Postgres, runs the PHP Visibility Panel on each, and
 * stores the results. One run at a time; request concurrency lives inside the
 * panel.
 *
 *   npm run worker                            # local; reads .env.local
 *   AEO_EXIT_WHEN_IDLE=true npm run worker    # drain the queue, then exit
 *
 * Crash safety: a claimed run carries a lease token and a heartbeat. If this
 * process dies, the heartbeat stops, and once the lease expires another worker
 * reclaims the run. Every write back to a run checks the token, so a worker
 * that lost its lease can never overwrite the one that took over.
 *
 * Emails: every pass first sweeps for verified requests on finished runs that
 * haven't been emailed, so a crash after storing results never loses one. A
 * run that fails for good (including a dead worker's last attempt) emails
 * AEO_ADMIN_EMAIL.
 */
import { closeDb } from '@/lib/db'
import { workerConfig, type WorkerConfig } from '@/lib/aeo/config'
import { buildJob, PanelAbortedError, PanelExitError, runPanelJob } from '@/lib/aeo/job'
import { notifyRunFailed, sendPendingReportEmails } from '@/lib/aeo/notify'
import { decideOutcome } from '@/lib/aeo/outcome'
import { PermanentRunError, planRun } from '@/lib/aeo/plan'
import {
  answeredQueries,
  claimNextRun,
  completeRun,
  failAttempt,
  heartbeat,
  LeaseLostError,
  releaseRun,
  saveProgress,
  spentTodayUsd,
  sweepAbandoned,
  type ClaimedRun,
  type PanelResultRow,
} from '@/lib/aeo/queue'

const SPEND_CAP_WAIT_MS = 10 * 60 * 1000

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...fields }))
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Email problems are logged, never allowed to stop the worker or change a run. */
async function alertRunFailed(runId: string, error: string): Promise<void> {
  try {
    const result = await notifyRunFailed(runId, error)
    log('admin_alert', { run: runId, sent: result.sent, skipped: result.skipped, error: result.error })
  } catch (err) {
    log('admin_alert_error', { run: runId, error: errorMessage(err) })
  }
}

async function sweepReportEmails(): Promise<void> {
  try {
    const result = await sendPendingReportEmails()
    if (result.sent || result.failed) log('report_emails', result)
  } catch (err) {
    log('report_email_error', { error: errorMessage(err) })
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}

async function processRun(run: ClaimedRun, config: WorkerConfig, shutdown: AbortSignal): Promise<void> {
  const job = new AbortController()
  const onShutdown = () => job.abort()
  shutdown.addEventListener('abort', onShutdown, { once: true })

  const beat = setInterval(() => {
    heartbeat(run)
      .then((held) => {
        if (!held) job.abort()
      })
      .catch((err) => log('heartbeat_error', { run: run.id, error: errorMessage(err) }))
  }, config.heartbeatMs)

  let cost = 0
  try {
    const questionCount =
      run.tier === 'full' ? Number.POSITIVE_INFINITY : config.snapshotQuestions
    const plan = await planRun(run, questionCount, { panelModel: config.panelModel })

    // A retried run asks only the questions earlier attempts didn't get answers for.
    const planQueries = plan.questions.map((q) => q.q)
    const alreadyAnswered = await answeredQueries(run.id)
    const toAsk = plan.questions.filter((q) => !alreadyAnswered.has(q.q))

    log('run_started', {
      run: run.id,
      attempt: run.attempts,
      domain: run.domain,
      questions: plan.questions.length,
      asking: toAsk.length,
      engines: run.engines,
    })

    let rows: PanelResultRow[] = []
    if (toAsk.length > 0) {
      const result = await runPanelJob({
        job: buildJob({ ...plan, questions: toAsk }, run.engines, config.concurrency),
        runId: run.id,
        phpBin: config.phpBin,
        panelScript: config.panelScript,
        workDir: config.workDir,
        timeoutMs: config.jobTimeoutSeconds * 1000,
        signal: job.signal,
      })
      rows = result.results
      cost = result.totals.cost_usd
    }

    const answered = new Set(planQueries.filter((q) => alreadyAnswered.has(q)))
    for (const row of rows) if (!row.error) answered.add(row.query)
    const outcome = decideOutcome({
      total: plan.questions.length,
      answered: answered.size,
      attempt: run.attempts,
      maxAttempts: config.maxAttempts,
    })

    if (outcome === 'complete') {
      const totals = await completeRun(run, rows, cost, { panelVersion: plan.panelVersion, planQueries })
      log('run_done', {
        run: run.id,
        questions: plan.questions.length,
        answered: totals.questionCount,
        cited: totals.citedCount,
        cost,
      })
      return
    }

    // Keep what was answered, so the next attempt only asks what's missing.
    await saveProgress(run, rows, cost, planQueries)
    cost = 0
    const missing = plan.questions.length - answered.size
    const firstError = rows.find((row) => row.error)?.error ?? 'no answer'
    const message = `${missing} of ${plan.questions.length} questions unanswered: ${firstError}`
    const status = await failAttempt(run, message, {
      permanent: outcome === 'fail',
      maxAttempts: config.maxAttempts,
    })
    log('run_attempt_failed', { run: run.id, status, answered: answered.size, missing, error: firstError })
    if (status === 'failed') await alertRunFailed(run.id, message)
  } catch (err) {
    if (err instanceof PanelAbortedError && shutdown.aborted) {
      await releaseRun(run)
      log('run_released', { run: run.id })
      return
    }
    if (err instanceof LeaseLostError || (err instanceof PanelAbortedError && job.signal.aborted)) {
      log('lease_lost', { run: run.id })
      return
    }

    // Exit 2 from the panel means an invalid job file — a bug, not a flaky provider.
    const permanent =
      err instanceof PermanentRunError || (err instanceof PanelExitError && err.code === 2)
    const status = await failAttempt(run, errorMessage(err), {
      permanent,
      costUsd: cost,
      maxAttempts: config.maxAttempts,
    })
    log('run_attempt_failed', { run: run.id, status, permanent, error: errorMessage(err) })
    if (status === 'failed') await alertRunFailed(run.id, errorMessage(err))
  } finally {
    clearInterval(beat)
    shutdown.removeEventListener('abort', onShutdown)
  }
}

/** One pass: sweep, check spend, claim and process at most one run. */
async function tick(config: WorkerConfig, shutdown: AbortSignal): Promise<'worked' | 'idle'> {
  await sweepReportEmails()

  for (const id of await sweepAbandoned(config)) {
    log('run_abandoned', { run: id })
    await alertRunFailed(id, 'worker stopped responding on its final attempt')
  }

  const spent = await spentTodayUsd()
  if (spent >= config.dailySpendCapUsd) {
    log('spend_cap_reached', { spent, cap: config.dailySpendCapUsd })
    if (config.exitWhenIdle) return 'idle'
    await sleep(SPEND_CAP_WAIT_MS, shutdown)
    return 'worked'
  }

  const run = await claimNextRun(config)
  if (!run) return 'idle'

  await processRun(run, config, shutdown)
  return 'worked'
}

async function main(): Promise<void> {
  const config = workerConfig()
  const shutdown = new AbortController()

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      log('shutdown_requested', { signal })
      shutdown.abort()
    })
  }

  log('worker_started', { ...config })

  while (!shutdown.signal.aborted) {
    try {
      const outcome = await tick(config, shutdown.signal)
      if (outcome === 'idle') {
        if (config.exitWhenIdle) break
        await sleep(config.pollMs, shutdown.signal)
      }
    } catch (err) {
      // Usually the database is unreachable. Back off and keep going.
      log('worker_error', { error: errorMessage(err) })
      await sleep(Math.max(config.pollMs, 5000), shutdown.signal)
    }
  }

  await closeDb()
  log('worker_stopped')
}

main().catch((err) => {
  log('worker_crashed', { error: errorMessage(err) })
  process.exit(1)
})
