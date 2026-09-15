export type PanelQuestion = { c: string; q: string }

const SLOT = /\{([a-z_]+)\}/g

/**
 * Fill {slot} placeholders. A question with any slot that has no value is
 * dropped rather than asked with a hole in it.
 */
export function fillSlots(
  questions: PanelQuestion[],
  values: Record<string, string | null | undefined>
): PanelQuestion[] {
  const filled: PanelQuestion[] = []
  for (const question of questions) {
    let missing = false
    const q = question.q.replace(SLOT, (_match, key: string) => {
      const value = values[key]?.trim()
      if (!value) {
        missing = true
        return ''
      }
      return value
    })
    if (!missing) filled.push({ c: question.c, q })
  }
  return filled
}

/**
 * Minimum questions per category in a snapshot, where the panel has them.
 * "Who does this near me" is the question a buyer asks right before calling,
 * so a snapshot always carries several.
 */
export const CATEGORY_MINIMUMS: Record<string, number> = {
  'service-geo': 4,
  cost: 2,
  permits: 2,
}

/** FNV-1a, 32-bit. Must stay stable across Node versions: a domain's sample can't change on deploy. */
export function hash32(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

type Ranked = PanelQuestion & { index: number; rank: number }

/**
 * Deterministic, stratified sample of `count` questions, returned in panel order.
 *
 * Each question's rank is a hash of the seed (the domain) and its own text, so
 * the same business always gets the same questions, and editing one question
 * in a panel doesn't reshuffle every other business's sample. Category minimums
 * are met first; the rest is taken round-robin so no category dominates.
 */
export function sampleQuestions(
  questions: PanelQuestion[],
  count: number,
  seed: string
): PanelQuestion[] {
  if (count >= questions.length) return questions.map(({ c, q }) => ({ c, q }))

  const ranked: Ranked[] = questions.map((question, index) => ({
    c: question.c,
    q: question.q,
    index,
    rank: hash32(`${seed}|${question.c}|${question.q}`),
  }))

  const byCategory = new Map<string, Ranked[]>()
  for (const item of ranked) {
    const list = byCategory.get(item.c) ?? []
    list.push(item)
    byCategory.set(item.c, list)
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => a.rank - b.rank || a.index - b.index)
  }

  const chosen = new Set<number>()
  const cursors = new Map<string, number>()

  const takeNext = (category: string): boolean => {
    const list = byCategory.get(category) ?? []
    let cursor = cursors.get(category) ?? 0
    while (cursor < list.length && chosen.has(list[cursor].index)) cursor++
    const found = cursor < list.length
    if (found) chosen.add(list[cursor].index)
    cursors.set(category, found ? cursor + 1 : cursor)
    return found
  }

  for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS)) {
    for (let i = 0; i < minimum && chosen.size < count; i++) {
      if (!takeNext(category)) break
    }
  }

  const categories = [...byCategory.keys()].sort()
  while (chosen.size < count) {
    let progressed = false
    for (const category of categories) {
      if (chosen.size >= count) break
      if (takeNext(category)) progressed = true
    }
    if (!progressed) break
  }

  return ranked.filter((item) => chosen.has(item.index)).map(({ c, q }) => ({ c, q }))
}
