import { computeDelta } from '@/lib/metrics/period'
import type { MetricDirection, MetricPoint } from '@/lib/metrics/types'

/**
 * Compact, LLM-facing summary of one metric. Pure & deterministic — the numeric
 * analysis happens here, in code, not in the model. The model only phrases it.
 */
export type AiMetric = {
  key: string
  label: string
  unit: string | null
  direction: MetricDirection
  current: number | null
  previous: number | null
  target: number | null
  absoluteChange: number | null
  pctChange: number | null
  sentiment: 'good' | 'bad' | 'neutral'
  periodStart: string | null
  periodEnd: string | null
  recentTrend: number[]
}

export type OrgSummary = {
  orgName: string
  generatedAt: string
  metrics: AiMetric[]
}

export type DefLite = {
  key: string
  label: string
  unit: string | null
  direction: MetricDirection
  target: number | null
}

/** Turn a metric definition + its ascending series into an AiMetric. */
export function summarizeMetric(def: DefLite, series: MetricPoint[]): AiMetric {
  const n = series.length
  const current = n > 0 ? series[n - 1].value : null
  const previous = n > 1 ? series[n - 2].value : null
  const delta = computeDelta(current, previous, def.direction)
  const last = n > 0 ? series[n - 1] : null

  return {
    key: def.key,
    label: def.label,
    unit: def.unit,
    direction: def.direction,
    current,
    previous,
    target: def.target,
    absoluteChange: delta.absolute,
    pctChange: delta.pct === null ? null : Math.round(delta.pct * 10) / 10,
    sentiment: delta.sentiment,
    periodStart: last ? last.periodStart.toISOString().slice(0, 10) : null,
    periodEnd: last ? last.periodEnd.toISOString().slice(0, 10) : null,
    recentTrend: series.slice(-6).map((p) => p.value),
  }
}

export function buildSummary(
  orgName: string,
  generatedAt: Date,
  data: { def: DefLite; series: MetricPoint[] }[]
): OrgSummary {
  return {
    orgName,
    generatedAt: generatedAt.toISOString(),
    metrics: data.map((d) => summarizeMetric(d.def, d.series)),
  }
}

/** Set of valid metric keys in a summary (for ref validation). */
export function summaryKeys(summary: OrgSummary): Set<string> {
  return new Set(summary.metrics.map((m) => m.key))
}
