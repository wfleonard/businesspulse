import { formatValue, formatPct } from '@/lib/metrics/period'
import type { AiMetric } from '@/lib/ai/summarize'

/**
 * Alert rule evaluation — pure & deterministic. A rule watches one metric for a
 * condition; when the latest data meets it, we emit a triggered alert with a
 * severity and a plain-English message.
 */

export type AlertCondition =
  | 'pct_drop' // % change <= -threshold
  | 'pct_rise' // % change >= threshold
  | 'below_target' // current < metric target
  | 'above_target' // current > metric target
  | 'below_threshold' // current < threshold
  | 'above_threshold' // current > threshold

export const ALERT_CONDITIONS: AlertCondition[] = [
  'pct_drop',
  'pct_rise',
  'below_target',
  'above_target',
  'below_threshold',
  'above_threshold',
]

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type RuleLite = {
  id: string
  metricKey: string
  condition: AlertCondition
  threshold: number | null
}

export type TriggeredAlert = {
  ruleId: string
  metricKey: string
  severity: AlertSeverity
  message: string
}

function pctSeverity(pct: number, threshold: number): AlertSeverity {
  const mag = Math.abs(pct)
  if (mag >= 2 * threshold) return 'critical'
  return 'warning'
}

function offTargetSeverity(current: number, target: number): AlertSeverity {
  if (target === 0) return 'warning'
  return Math.abs(current - target) / Math.abs(target) >= 0.2 ? 'critical' : 'warning'
}

/** Evaluate one rule against one metric's summary. Returns null if not triggered. */
export function evaluateRule(rule: RuleLite, m: AiMetric): TriggeredAlert | null {
  const t = rule.threshold
  const fmt = (v: number | null) => formatValue(v, m.unit)

  switch (rule.condition) {
    case 'pct_drop': {
      if (m.pctChange === null || t === null) return null
      if (m.pctChange <= -t) {
        return {
          ruleId: rule.id,
          metricKey: m.key,
          severity: pctSeverity(m.pctChange, t),
          message: `${m.label} dropped ${formatPct(m.pctChange)} (now ${fmt(m.current)}, was ${fmt(m.previous)}).`,
        }
      }
      return null
    }
    case 'pct_rise': {
      if (m.pctChange === null || t === null) return null
      if (m.pctChange >= t) {
        return {
          ruleId: rule.id,
          metricKey: m.key,
          severity: pctSeverity(m.pctChange, t),
          message: `${m.label} rose ${formatPct(m.pctChange)} (now ${fmt(m.current)}, was ${fmt(m.previous)}).`,
        }
      }
      return null
    }
    case 'below_target': {
      if (m.current === null || m.target === null) return null
      if (m.current < m.target) {
        return {
          ruleId: rule.id,
          metricKey: m.key,
          severity: offTargetSeverity(m.current, m.target),
          message: `${m.label} is below target: ${fmt(m.current)} vs target ${fmt(m.target)}.`,
        }
      }
      return null
    }
    case 'above_target': {
      if (m.current === null || m.target === null) return null
      if (m.current > m.target) {
        return {
          ruleId: rule.id,
          metricKey: m.key,
          severity: offTargetSeverity(m.current, m.target),
          message: `${m.label} is above target: ${fmt(m.current)} vs target ${fmt(m.target)}.`,
        }
      }
      return null
    }
    case 'below_threshold': {
      if (m.current === null || t === null) return null
      if (m.current < t) {
        return {
          ruleId: rule.id,
          metricKey: m.key,
          severity: 'warning',
          message: `${m.label} fell below ${fmt(t)} (now ${fmt(m.current)}).`,
        }
      }
      return null
    }
    case 'above_threshold': {
      if (m.current === null || t === null) return null
      if (m.current > t) {
        return {
          ruleId: rule.id,
          metricKey: m.key,
          severity: 'warning',
          message: `${m.label} rose above ${fmt(t)} (now ${fmt(m.current)}).`,
        }
      }
      return null
    }
    default:
      return null
  }
}

/** Evaluate all rules against a summary's metrics (keyed by metricKey). */
export function evaluateRules(
  rules: RuleLite[],
  metrics: AiMetric[]
): TriggeredAlert[] {
  const byKey = new Map(metrics.map((m) => [m.key, m]))
  const out: TriggeredAlert[] = []
  for (const rule of rules) {
    const m = byKey.get(rule.metricKey)
    if (!m) continue
    const hit = evaluateRule(rule, m)
    if (hit) out.push(hit)
  }
  return out
}

export type MaterialChange = {
  key: string
  label: string
  pctChange: number
  current: number | null
  previous: number | null
  sentiment: 'good' | 'bad' | 'neutral'
}

/** Metrics whose period-over-period change is at least `pctThreshold`%. */
export function detectMaterialChanges(
  metrics: AiMetric[],
  pctThreshold = 10
): MaterialChange[] {
  return metrics
    .filter((m) => m.pctChange !== null && Math.abs(m.pctChange) >= pctThreshold)
    .map((m) => ({
      key: m.key,
      label: m.label,
      pctChange: m.pctChange as number,
      current: m.current,
      previous: m.previous,
      sentiment: m.sentiment,
    }))
    .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
}
