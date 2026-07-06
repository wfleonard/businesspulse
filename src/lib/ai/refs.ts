import type { Answer } from './schema'

/**
 * Keep only source-metric refs that actually exist in the summary, mapped to
 * their labels for rendering. Guards against the model citing a key it invented.
 */
export function resolveRefs(
  refs: string[],
  known: Map<string, string>
): { key: string; label: string }[] {
  const seen = new Set<string>()
  const out: { key: string; label: string }[] = []
  for (const key of refs) {
    if (seen.has(key)) continue
    const label = known.get(key)
    if (label) {
      out.push({ key, label })
      seen.add(key)
    }
  }
  return out
}

/** Drop invented keys from the answer's refs before it reaches the client. */
export function sanitizeAnswer(answer: Answer, known: Map<string, string>): Answer {
  return { ...answer, sourceMetricRefs: answer.sourceMetricRefs.filter((k) => known.has(k)) }
}
