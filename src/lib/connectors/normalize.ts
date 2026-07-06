import { getPath, getRows } from './path'
import type { EndpointConfig, NormalizedValue } from './config'

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
  const rows = getRows(response, endpoint.rowsPath)

  if (rows.length === 0) {
    out.errors.push(
      endpoint.rowsPath
        ? `No rows at "${endpoint.rowsPath}"`
        : 'Response contained no rows'
    )
    return out
  }

  rows.forEach((row, ri) => {
    for (const m of endpoint.mappings) {
      const value = toNumber(getPath(row, m.valuePath))
      if (value === null) {
        out.errors.push(`row ${ri}: ${m.metricKey} value at "${m.valuePath}" not numeric`)
        continue
      }
      const periodStart = toDate(getPath(row, m.periodStartPath))
      if (!periodStart) {
        out.errors.push(
          `row ${ri}: ${m.metricKey} period_start at "${m.periodStartPath}" not a date`
        )
        continue
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
    }
  })

  return out
}
