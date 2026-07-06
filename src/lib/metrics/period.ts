import type { Delta, MetricDirection, Sentiment } from './types'

/**
 * Pure metric math — no DB, fully unit-tested.
 */

/** Whether a change is good/bad/neutral given the metric's desired direction. */
export function sentimentOf(absolute: number | null, direction: MetricDirection): Sentiment {
  if (absolute === null || absolute === 0) return 'neutral'
  const improving = direction === 'up_good' ? absolute > 0 : absolute < 0
  return improving ? 'good' : 'bad'
}

/** Change from previous → current. Percent is null when previous is 0/absent. */
export function computeDelta(
  current: number | null,
  previous: number | null,
  direction: MetricDirection
): Delta {
  if (current === null || previous === null) {
    return { absolute: null, pct: null, sentiment: 'neutral' }
  }
  const absolute = current - previous
  const pct = previous === 0 ? null : (absolute / Math.abs(previous)) * 100
  return { absolute, pct, sentiment: sentimentOf(absolute, direction) }
}

/** Format a metric value with an optional unit (currency, %, plain number). */
export function formatValue(value: number | null, unit: string | null): string {
  if (value === null || Number.isNaN(value)) return '—'
  const u = unit?.trim() ?? ''
  if (u === '$' || u.toLowerCase() === 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value)
  }
  if (u === '%') {
    return `${trimNum(value)}%`
  }
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
  return u ? `${formatted} ${u}` : formatted
}

/** Signed percent label, e.g. "+12.3%" or "−8%". */
export function formatPct(pct: number | null): string {
  if (pct === null || Number.isNaN(pct)) return '—'
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return `${sign}${trimNum(Math.abs(pct))}%`
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** Human range like "Jun 1 – Jun 30, 2026". */
export function formatPeriodRange(start: Date | null, end: Date | null): string {
  if (!start || !end) return '—'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const s = start.toLocaleDateString('en-US', opts)
  const e = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${s} – ${e}`
}
