/**
 * Plain-language state of a run for the dashboard.
 *
 * A run that answered most of its questions and went back in the queue is
 * normal: the worker retries the missing ones. Showing the raw error there
 * reads like a failure, so this turns it into a sentence.
 */

export type RunStateNote = {
  tone: 'retrying' | 'failed'
  headline: string
  /** The underlying cause, when there is one worth showing. */
  detail?: string
}

export type RunStateInput = {
  status: 'queued' | 'running' | 'done' | 'failed'
  attempts: number
  error: string | null
  /** When the last attempt ended; the retry delay counts from here. */
  lockedAt: Date | null
}

/** The worker's "N of M questions unanswered: cause" message. */
export function parseUnanswered(error: string): { missing: number; total: number; cause: string } | null {
  const match = /^(\d+) of (\d+) questions unanswered: ([\s\S]+)$/.exec(error.trim())
  if (!match) return null
  return { missing: Number(match[1]), total: Number(match[2]), cause: match[3].trim() }
}

function inWords(msFromNow: number): string {
  if (msFromNow <= 30_000) return 'shortly'
  const minutes = Math.round(msFromNow / 60_000)
  return minutes <= 1 ? 'in about a minute' : `in about ${minutes} minutes`
}

export function describeRunState(
  run: RunStateInput,
  options: { maxAttempts: number; retryDelaySeconds: number; now?: Date }
): RunStateNote | null {
  const { maxAttempts, retryDelaySeconds } = options
  const now = options.now ?? new Date()

  if (run.status === 'failed') {
    return {
      tone: 'failed',
      headline: `Failed after ${run.attempts} ${run.attempts === 1 ? 'attempt' : 'attempts'}.`,
      detail: run.error ?? undefined,
    }
  }

  // Queued with an error means an attempt fell short and the worker will try again.
  if (run.status !== 'queued' || !run.error || run.attempts === 0) return null

  const when = run.lockedAt
    ? ` next try ${inWords(run.lockedAt.getTime() + run.attempts * retryDelaySeconds * 1000 - now.getTime())}`
    : ''
  const attempt = `Attempt ${run.attempts} of ${maxAttempts}`
  const unanswered = parseUnanswered(run.error)

  if (!unanswered) {
    return {
      tone: 'retrying',
      headline: `${attempt} didn't finish. It retries automatically,${when || ' shortly'}.`.replace(',.', '.'),
      detail: run.error,
    }
  }

  const answered = unanswered.total - unanswered.missing
  return {
    tone: 'retrying',
    headline: `${attempt} answered ${answered} of ${unanswered.total} questions. The rest are retried automatically,${when || ' shortly'}.`.replace(
      ',.',
      '.'
    ),
    detail: unanswered.cause,
  }
}
