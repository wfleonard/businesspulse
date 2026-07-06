import { evaluateRule, evaluateRules, detectMaterialChanges, type RuleLite } from '@/lib/watch/rules'
import type { AiMetric } from '@/lib/ai/summarize'

function metric(partial: Partial<AiMetric>): AiMetric {
  return {
    key: 'monthly_revenue',
    label: 'Monthly Revenue',
    unit: '$',
    direction: 'up_good',
    current: 100,
    previous: 100,
    target: null,
    absoluteChange: 0,
    pctChange: 0,
    sentiment: 'neutral',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    recentTrend: [],
    ...partial,
  }
}

const rule = (partial: Partial<RuleLite>): RuleLite => ({
  id: 'r1',
  metricKey: 'monthly_revenue',
  condition: 'pct_drop',
  threshold: 10,
  ...partial,
})

describe('evaluateRule', () => {
  it('pct_drop triggers at/over threshold; warning vs critical by magnitude', () => {
    expect(evaluateRule(rule({}), metric({ pctChange: -5 }))).toBeNull()
    expect(evaluateRule(rule({}), metric({ pctChange: -12 }))?.severity).toBe('warning')
    expect(evaluateRule(rule({}), metric({ pctChange: -25 }))?.severity).toBe('critical')
  })

  it('pct_rise triggers on rise', () => {
    const r = rule({ condition: 'pct_rise' })
    expect(evaluateRule(r, metric({ pctChange: 5 }))).toBeNull()
    expect(evaluateRule(r, metric({ pctChange: 15 }))?.message).toMatch(/rose/)
  })

  it('below_target uses the metric target', () => {
    const r = rule({ condition: 'below_target', threshold: null })
    expect(evaluateRule(r, metric({ current: 28, target: 45 }))?.severity).toBe('critical')
    expect(evaluateRule(r, metric({ current: 44, target: 45 }))?.severity).toBe('warning')
    expect(evaluateRule(r, metric({ current: 50, target: 45 }))).toBeNull()
  })

  it('above_threshold / below_threshold use the rule threshold', () => {
    expect(
      evaluateRule(rule({ condition: 'above_threshold', threshold: 20000 }), metric({ current: 22000 }))
        ?.message
    ).toMatch(/rose above/)
    expect(
      evaluateRule(rule({ condition: 'below_threshold', threshold: 100 }), metric({ current: 90 }))
        ?.severity
    ).toBe('warning')
  })

  it('returns null when required data is missing', () => {
    expect(evaluateRule(rule({}), metric({ pctChange: null }))).toBeNull()
    expect(evaluateRule(rule({ condition: 'below_target' }), metric({ target: null }))).toBeNull()
  })
})

describe('evaluateRules', () => {
  it('matches rules to metrics by key and skips unknown metrics', () => {
    const metrics = [metric({ key: 'monthly_revenue', pctChange: -20 })]
    const rules = [
      rule({ id: 'a', metricKey: 'monthly_revenue' }),
      rule({ id: 'b', metricKey: 'nonexistent' }),
    ]
    const out = evaluateRules(rules, metrics)
    expect(out).toHaveLength(1)
    expect(out[0].ruleId).toBe('a')
  })
})

describe('detectMaterialChanges', () => {
  it('returns metrics past the threshold, sorted by magnitude', () => {
    const metrics = [
      metric({ key: 'a', label: 'A', pctChange: 5 }),
      metric({ key: 'b', label: 'B', pctChange: -18 }),
      metric({ key: 'c', label: 'C', pctChange: 30 }),
    ]
    const changes = detectMaterialChanges(metrics, 10)
    expect(changes.map((c) => c.key)).toEqual(['c', 'b'])
  })
})
