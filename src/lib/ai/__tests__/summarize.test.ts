import { summarizeMetric, buildSummary, summaryKeys, type DefLite } from '@/lib/ai/summarize'
import type { MetricPoint } from '@/lib/metrics/types'

const def: DefLite = {
  key: 'monthly_revenue',
  label: 'Monthly Revenue',
  unit: '$',
  direction: 'up_good',
  target: 120000,
}

function pt(start: string, end: string, value: number): MetricPoint {
  return { periodStart: new Date(start), periodEnd: new Date(end), value }
}

describe('summarizeMetric', () => {
  it('computes current/previous/delta from an ascending series', () => {
    const series = [
      pt('2026-04-01', '2026-04-30', 105000),
      pt('2026-05-01', '2026-05-31', 118000),
      pt('2026-06-01', '2026-06-30', 121000),
    ]
    const m = summarizeMetric(def, series)
    expect(m.current).toBe(121000)
    expect(m.previous).toBe(118000)
    expect(m.absoluteChange).toBe(3000)
    expect(m.pctChange).toBeCloseTo(2.5, 1)
    expect(m.sentiment).toBe('good')
    expect(m.periodEnd).toBe('2026-06-30')
    expect(m.recentTrend).toEqual([105000, 118000, 121000])
  })

  it('caps recentTrend to the last 6 points', () => {
    const series = Array.from({ length: 10 }, (_, i) =>
      pt('2026-01-01', '2026-01-31', i)
    )
    expect(summarizeMetric(def, series).recentTrend).toEqual([4, 5, 6, 7, 8, 9])
  })

  it('handles a single point (no previous)', () => {
    const m = summarizeMetric(def, [pt('2026-06-01', '2026-06-30', 100)])
    expect(m.current).toBe(100)
    expect(m.previous).toBeNull()
    expect(m.absoluteChange).toBeNull()
  })

  it('handles an empty series', () => {
    const m = summarizeMetric(def, [])
    expect(m.current).toBeNull()
    expect(m.periodEnd).toBeNull()
    expect(m.recentTrend).toEqual([])
  })
})

describe('buildSummary / summaryKeys', () => {
  it('builds an org summary and lists keys', () => {
    const s = buildSummary('Acme', new Date('2026-07-01T00:00:00Z'), [
      { def, series: [pt('2026-06-01', '2026-06-30', 121000)] },
    ])
    expect(s.orgName).toBe('Acme')
    expect(s.generatedAt).toBe('2026-07-01T00:00:00.000Z')
    expect(s.metrics).toHaveLength(1)
    expect([...summaryKeys(s)]).toEqual(['monthly_revenue'])
  })
})
