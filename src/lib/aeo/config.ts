import os from 'os'
import path from 'path'

/**
 * AEO worker settings, read once at startup.
 *
 * Missing or invalid values fall back to defaults instead of crashing, and the
 * worker logs the effective config, so a typo shows up in the logs rather than
 * as a silent change in behavior.
 */
export type WorkerConfig = {
  pollMs: number
  dailySpendCapUsd: number
  leaseSeconds: number
  heartbeatMs: number
  retryDelaySeconds: number
  jobTimeoutSeconds: number
  maxAttempts: number
  snapshotQuestions: number
  concurrency: number
  /** Claude model that writes generated panels. */
  panelModel: string
  /** 30-day re-check of consenting leads: off switch, age, and a daily ceiling on new runs. */
  recheckEnabled: boolean
  recheckDays: number
  recheckMaxPerDay: number
  /** Contact details are erased this many days after the request (4 months). */
  retentionDays: number
  phpBin: string
  panelScript: string
  workDir: string
  exitWhenIdle: boolean
}

type Env = Record<string, string | undefined>

function positive(env: Env, name: string, fallback: number): number {
  const raw = env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function wholePositive(env: Env, name: string, fallback: number): number {
  return Math.max(1, Math.floor(positive(env, name, fallback)))
}

export function workerConfig(env: Env = process.env, cwd: string = process.cwd()): WorkerConfig {
  const leaseSeconds = wholePositive(env, 'AEO_LEASE_SECONDS', 300)

  return {
    pollMs: wholePositive(env, 'AEO_WORKER_POLL_MS', 3000),
    dailySpendCapUsd: positive(env, 'AEO_DAILY_SPEND_CAP_USD', 10),
    leaseSeconds,
    // Five heartbeats per lease, so one slow or missed beat never costs the lease.
    heartbeatMs: Math.max(1000, Math.floor((leaseSeconds * 1000) / 5)),
    retryDelaySeconds: wholePositive(env, 'AEO_RETRY_DELAY_SECONDS', 60),
    jobTimeoutSeconds: wholePositive(env, 'AEO_JOB_TIMEOUT_SECONDS', 600),
    maxAttempts: wholePositive(env, 'AEO_MAX_ATTEMPTS', 3),
    snapshotQuestions: wholePositive(env, 'AEO_SNAPSHOT_QUESTIONS', 20),
    // Perplexity rate-limits readily; 3 at once lost 13 of 20 answers in a live snapshot.
    concurrency: Math.min(10, wholePositive(env, 'AEO_PANEL_CONCURRENCY', 2)),
    panelModel: env.AEO_PANEL_MODEL?.trim() || 'claude-sonnet-5',
    recheckEnabled: env.AEO_RECHECK_ENABLED !== 'false',
    recheckDays: wholePositive(env, 'AEO_RECHECK_DAYS', 30),
    recheckMaxPerDay: wholePositive(env, 'AEO_RECHECK_MAX_PER_DAY', 10),
    retentionDays: wholePositive(env, 'AEO_RETENTION_DAYS', 120),
    phpBin: env.AEO_PHP_BIN?.trim() || 'php',
    panelScript: env.AEO_PANEL_SCRIPT?.trim() || path.join(cwd, 'panel', 'panel.php'),
    workDir: env.AEO_WORK_DIR?.trim() || path.join(os.tmpdir(), 'aeo-worker'),
    exitWhenIdle: env.AEO_EXIT_WHEN_IDLE === 'true',
  }
}
