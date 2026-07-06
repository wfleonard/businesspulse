export type MetricDirection = 'up_good' | 'down_good'

/** A single time-series point for a metric. */
export type MetricPoint = {
  periodStart: Date
  periodEnd: Date
  value: number
}

/** Sentiment of a change given the metric's desired direction. */
export type Sentiment = 'good' | 'bad' | 'neutral'

export type Delta = {
  absolute: number | null
  pct: number | null
  sentiment: Sentiment
}

/** Dashboard KPI card model: current value + change vs the prior period. */
export type MetricSummary = {
  key: string
  label: string
  unit: string | null
  direction: MetricDirection
  current: number | null
  previous: number | null
  periodStart: Date | null
  periodEnd: Date | null
  delta: Delta
}
