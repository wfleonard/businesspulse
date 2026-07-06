/**
 * Tiny dot/bracket path accessor for JSON responses. Pure & testable.
 *
 *   getPath({a: {b: [{c: 5}]}}, 'a.b[0].c')  -> 5
 *   getPath({data: {items: [...]}}, 'data.items')  -> [...]
 *
 * Not full JSONPath — just the dot + [index] subset that covers most REST APIs.
 * Returns undefined for any missing segment (never throws).
 */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const tokens = path.match(/[^.[\]]+|\[\d+\]/g)
  if (!tokens) return undefined

  let cur: unknown = obj
  for (const tok of tokens) {
    if (cur == null) return undefined
    const idxMatch = /^\[(\d+)\]$/.exec(tok)
    if (idxMatch) {
      if (!Array.isArray(cur)) return undefined
      cur = cur[Number(idxMatch[1])]
    } else {
      if (typeof cur !== 'object') return undefined
      cur = (cur as Record<string, unknown>)[tok]
    }
  }
  return cur
}

/** Resolve a path expected to be an array; returns [] if absent/not array. */
export function getRows(obj: unknown, path?: string): unknown[] {
  const target = path ? getPath(obj, path) : obj
  if (Array.isArray(target)) return target
  if (target == null) return []
  // A single object with no rowsPath is treated as one row.
  return [target]
}
