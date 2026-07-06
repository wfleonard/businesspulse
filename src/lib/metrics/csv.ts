import { z } from 'zod'

/**
 * Minimal RFC-4180-style CSV parser + metric-row validation. Pure and testable.
 *
 * Expected columns (header row, case-insensitive, order-independent):
 *   metric_key, period_start, period_end, value, [dimension:<name> ...]
 *
 * Any column named `dimension:foo` becomes dimensions.foo on the row.
 */

/** Parse CSV text into rows of raw string cells. Handles quotes, escaped
 * quotes (""), and newlines inside quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }
  // Flush trailing field/row (unless the input ended on a newline with no data).
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export type MetricCsvRow = {
  metricKey: string
  periodStart: Date
  periodEnd: Date
  value: number
  dimensions: Record<string, string>
}

const rowSchema = z.object({
  metricKey: z.string().min(1, 'metric_key is required'),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  value: z.coerce.number().finite(),
})

export type CsvParseResult = {
  rows: MetricCsvRow[]
  errors: { line: number; message: string }[]
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

/** Parse + validate a metric CSV. Returns valid rows and per-line errors. */
export function parseMetricCsv(text: string): CsvParseResult {
  const table = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''))
  const result: CsvParseResult = { rows: [], errors: [] }
  if (table.length === 0) {
    result.errors.push({ line: 0, message: 'Empty file' })
    return result
  }

  const header = table[0].map(normalizeHeader)
  const idx = {
    metricKey: header.indexOf('metric_key'),
    periodStart: header.indexOf('period_start'),
    periodEnd: header.indexOf('period_end'),
    value: header.indexOf('value'),
  }
  const missing = Object.entries(idx)
    .filter(([, v]) => v === -1)
    .map(([k]) => k)
  if (missing.length > 0) {
    result.errors.push({
      line: 1,
      message: `Missing required column(s): ${missing.join(', ')}`,
    })
    return result
  }

  const dimensionCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.startsWith('dimension:'))
    .map(({ h, i }) => ({ name: h.slice('dimension:'.length), i }))

  for (let r = 1; r < table.length; r++) {
    const cells = table[r]
    const raw = {
      metricKey: cells[idx.metricKey]?.trim() ?? '',
      periodStart: cells[idx.periodStart]?.trim() ?? '',
      periodEnd: cells[idx.periodEnd]?.trim() ?? '',
      value: cells[idx.value]?.trim() ?? '',
    }
    const parsed = rowSchema.safeParse(raw)
    if (!parsed.success) {
      result.errors.push({
        line: r + 1,
        message: parsed.error.issues.map((e) => e.message).join('; '),
      })
      continue
    }
    if (parsed.data.periodEnd < parsed.data.periodStart) {
      result.errors.push({ line: r + 1, message: 'period_end is before period_start' })
      continue
    }
    const dimensions: Record<string, string> = {}
    for (const d of dimensionCols) {
      const v = cells[d.i]?.trim()
      if (v) dimensions[d.name] = v
    }
    result.rows.push({ ...parsed.data, dimensions })
  }

  return result
}
