import { PanelAbortedError, PanelExitError, type PanelResult } from './job'
import type { RunPlan } from './plan'
import type { PanelQuestion } from './questions'
import { answerKey } from './queue'

type Row = PanelResult['results'][number]

export type EngineResult = { rows: Row[]; costUsd: number }

/**
 * Ask a Pulse run's questions one assistant at a time (docs/pulse-plan.md §4.3).
 *
 * Each assistant is its own panel job with its own time limit, so a slow one
 * can't time out the rest, and its answers are saved before the next starts.
 * Only question and assistant pairs without an answer yet are asked, so a
 * retry spends money only on the gaps. An assistant that fails outright is
 * recorded and the others still run; aborts and invalid jobs stop the run.
 */
export async function askPulseEngines(args: {
  plan: Pick<RunPlan, 'questions'>
  engines: readonly string[]
  /** Pairs answered by earlier attempts, keyed by answerKey. Updated in place. */
  answered: Set<string>
  runEngine: (engine: string, questions: PanelQuestion[]) => Promise<EngineResult>
  save: (rows: Row[], costUsd: number) => Promise<void>
  /**
   * When an assistant rate-limits, it gets up to this many more passes at its
   * missing questions in the same attempt, after `pause`. Other errors wait for
   * the next attempt.
   */
  rateLimitPasses?: number
  pause?: (engine: string) => Promise<void>
  log?: (event: string, fields: Record<string, unknown>) => void
}): Promise<{ errors: string[]; costUsd: number }> {
  const { plan, engines, answered, runEngine, save, rateLimitPasses = 0, pause = async () => {}, log = () => {} } = args
  const errors: string[] = []
  let costUsd = 0

  for (const engine of engines) {
    let lastError: string | undefined
    for (let pass = 0; pass <= rateLimitPasses; pass++) {
      const toAsk = plan.questions.filter((q) => !answered.has(answerKey(engine, q.q)))
      if (toAsk.length === 0) {
        lastError = undefined
        break
      }
      if (pass > 0) {
        if (!lastError || !isRateLimit(lastError)) break
        log('pulse_rate_limit_pause', { engine, missing: toAsk.length, pass })
        await pause(engine)
      }

      const startedAt = Date.now()
      let result: EngineResult
      try {
        result = await runEngine(engine, toAsk)
      } catch (err) {
        if (err instanceof PanelAbortedError || (err instanceof PanelExitError && err.code === 2)) throw err
        lastError = err instanceof Error ? err.message : String(err)
        log('pulse_engine_failed', { engine, asked: toAsk.length, pass, error: lastError })
        continue
      }

      await save(result.rows, result.costUsd)
      costUsd += result.costUsd
      let got = 0
      for (const row of result.rows) {
        if (row.error) continue
        answered.add(answerKey(row.engine, row.query))
        got++
      }
      lastError = result.rows.find((row) => row.error)?.error ?? undefined
      log('pulse_engine_done', {
        engine,
        pass,
        asked: toAsk.length,
        answered: got,
        costUsd: result.costUsd,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      })
    }
    if (lastError) errors.push(`${engine}: ${lastError}`)
  }

  return { errors, costUsd }
}

/** Provider rate limits, as the panel reports them. Quota exhaustion is not one: waiting won't fix it. */
export function isRateLimit(message: string): boolean {
  return /\b429\b|rate limit|too_many_requests/i.test(message) && !/quota/i.test(message)
}

/** How many of the plan's question and assistant pairs have an answer. */
export function countAnswered(plan: Pick<RunPlan, 'questions'>, engines: readonly string[], answered: Set<string>): number {
  let count = 0
  for (const engine of engines) for (const q of plan.questions) if (answered.has(answerKey(engine, q.q))) count++
  return count
}
