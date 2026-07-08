import { getPath, getRows } from './path'
import type { EndpointConfig, Mapping, NormalizedValue } from './config'

export type NormalizeResult = {
  values: NormalizedValue[]
  errors: string[]
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const cleaned = v.replace(/[$,\s]/g, '')
    if (cleaned === '') return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

type Granularity = 'day' | 'month' | 'quarter' | 'year'

/** Bucket a date into a period (UTC): key + start + end-of-period. */
function periodBucket(d: Date, g: Granularity): { key: string; start: Date; end: Date } {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  if (g === 'day') {
    const start = new Date(Date.UTC(y, m, d.getUTCDate()))
    return { key: `${y}-${m}-${d.getUTCDate()}`, start, end: start }
  }
  if (g === 'year') {
    return { key: `${y}`, start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y, 11, 31)) }
  }
  if (g === 'quarter') {
    const qs = Math.floor(m / 3) * 3
    return {
      key: `${y}-Q${qs / 3 + 1}`,
      start: new Date(Date.UTC(y, qs, 1)),
      end: new Date(Date.UTC(y, qs + 3, 0)),
    }
  }
  return {
    key: `${y}-${m}`,
    start: new Date(Date.UTC(y, m, 1)),
    end: new Date(Date.UTC(y, m + 1, 0)),
  }
}

function perRow(rows: unknown[], m: Mapping, out: NormalizeResult) {
  rows.forEach((row, ri) => {
    const value = toNumber(getPath(row, m.valuePath as string))
    if (value === null) {
      out.errors.push(`row ${ri}: ${m.metricKey} value at "${m.valuePath}" not numeric`)
      return
    }
    const periodStart = toDate(getPath(row, m.periodStartPath))
    if (!periodStart) {
      out.errors.push(`row ${ri}: ${m.metricKey} period_start at "${m.periodStartPath}" not a date`)
      return
    }
    const periodEnd = m.periodEndPath
      ? (toDate(getPath(row, m.periodEndPath)) ?? periodStart)
      : periodStart
    const dimensions: Record<string, string> = {}
    if (m.dimensions) {
      for (const [name, path] of Object.entries(m.dimensions)) {
        const dv = getPath(row, path)
        if (dv != null) dimensions[name] = String(dv)
      }
    }
    out.values.push({ metricKey: m.metricKey, periodStart, periodEnd, value, dimensions })
  })
}

function aggregate(rows: unknown[], m: Mapping, out: NormalizeResult) {
  const g = (m.periodGranularity ?? 'month') as Granularity
  const buckets = new Map<string, { start: Date; end: Date; value: number }>()
  rows.forEach((row, ri) => {
    const d = toDate(getPath(row, m.periodStartPath))
    if (!d) {
      out.errors.push(`row ${ri}: ${m.metricKey} period_start at "${m.periodStartPath}" not a date`)
      return
    }
    let contrib = 1
    if (m.aggregate === 'sum') {
      const v = toNumber(getPath(row, m.valuePath as string))
      if (v === null) {
        out.errors.push(`row ${ri}: ${m.metricKey} value at "${m.valuePath}" not numeric`)
        return
      }
      contrib = v
    }
    const b = periodBucket(d, g)
    const cur = buckets.get(b.key) ?? { start: b.start, end: b.end, value: 0 }
    cur.value += contrib
    buckets.set(b.key, cur)
  })
  for (const b of buckets.values()) {
    out.values.push({
      metricKey: m.metricKey,
      periodStart: b.start,
      periodEnd: b.end,
      value: b.value,
      dimensions: {},
    })
  }
}

/**
 * Turn one endpoint's raw JSON response into normalized metric values, applying
 * each mapping to each row. Pure: no network, no DB. Collects per-row errors
 * instead of throwing, so one bad row doesn't sink the whole sync.
 */
export function normalizeEndpoint(
  response: unknown,
  endpoint: EndpointConfig
): NormalizeResult {
  const out: NormalizeResult = { values: [], errors: [] }
  let rows = getRows(response, endpoint.rowsPath)

  if (endpoint.filter && endpoint.filter.length > 0) {
    rows = rows.filter((r) =>
      endpoint.filter!.every(
        (f) => String(getPath(r, f.path) ?? '').toLowerCase() === f.equals.toLowerCase()
      )
    )
  }

  if (rows.length === 0) {
    out.errors.push(
      endpoint.rowsPath ? `No rows at "${endpoint.rowsPath}"` : 'Response contained no rows'
    )
    return out
  }

  for (const m of endpoint.mappings) {
    if (m.aggregate) aggregate(rows, m, out)
    else perRow(rows, m, out)
  }
  return out
}
