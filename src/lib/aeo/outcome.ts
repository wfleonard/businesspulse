/**
 * What to do with a run after an attempt, given how many of its questions now
 * have answers (from this attempt and earlier ones).
 *
 * - every question answered: complete
 * - some unanswered and attempts remain: retry, asking only the missing ones
 * - final attempt: complete with a partial report if at least half were
 *   answered, otherwise fail. A report built on a handful of answers would
 *   mislead the person reading it.
 */
export type RunOutcome = 'complete' | 'retry' | 'fail'

export function decideOutcome(args: {
  total: number
  answered: number
  attempt: number
  maxAttempts: number
}): RunOutcome {
  const { total, answered, attempt, maxAttempts } = args
  if (total > 0 && answered >= total) return 'complete'
  if (attempt < maxAttempts) return 'retry'
  return answered > 0 && answered * 2 >= total ? 'complete' : 'fail'
}
