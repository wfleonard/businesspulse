export type Granularity = 'month' | 'quarter' | 'year'

export type Period = { key: string; start: Date; label: string }

/** Canonical bucket key for a date at a given granularity (UTC-based). */
export function periodKey(date: Date, g: Granularity): string {
  const y = date.getUTCFullYear()
  if (g === 'year') return `${y}`
  if (g === 'quarter') return `${y}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`
  return `${y}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function labelFor(start: Date, g: Granularity): string {
  const y = start.getUTCFullYear()
  if (g === 'year') return `${y}`
  if (g === 'quarter') return `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${y}`
  return start.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function bucketStart(date: Date, g: Granularity): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  if (g === 'year') return new Date(Date.UTC(y, 0, 1))
  if (g === 'quarter') return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1))
  return new Date(Date.UTC(y, m, 1))
}

function advance(start: Date, g: Granularity): Date {
  const y = start.getUTCFullYear()
  const m = start.getUTCMonth()
  if (g === 'year') return new Date(Date.UTC(y + 1, 0, 1))
  if (g === 'quarter') return new Date(Date.UTC(y, m + 3, 1))
  return new Date(Date.UTC(y, m + 1, 1))
}

/** Ordered periods spanning [from, to] at the given granularity. */
export function generatePeriods(from: Date, to: Date, g: Granularity, max = 120): Period[] {
  const periods: Period[] = []
  let cur = bucketStart(from, g)
  const end = to.getTime()
  while (cur.getTime() <= end && periods.length < max) {
    periods.push({ key: periodKey(cur, g), start: new Date(cur), label: labelFor(cur, g) })
    cur = advance(cur, g)
  }
  return periods
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n)
}
