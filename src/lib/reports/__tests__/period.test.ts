import { periodKey, generatePeriods } from '@/lib/reports/period'

const d = (s: string) => new Date(s)

describe('periodKey', () => {
  it('month/quarter/year keys (UTC)', () => {
    expect(periodKey(d('2026-06-15T00:00:00Z'), 'month')).toBe('2026-06')
    expect(periodKey(d('2026-06-15T00:00:00Z'), 'quarter')).toBe('2026-Q2')
    expect(periodKey(d('2026-01-01T00:00:00Z'), 'quarter')).toBe('2026-Q1')
    expect(periodKey(d('2026-12-31T00:00:00Z'), 'year')).toBe('2026')
  })
})

describe('generatePeriods', () => {
  it('generates monthly periods inclusive', () => {
    const p = generatePeriods(d('2026-01-10T00:00:00Z'), d('2026-03-05T00:00:00Z'), 'month')
    expect(p.map((x) => x.key)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(p[0].label).toMatch(/Jan 2026/)
  })
  it('generates quarterly periods', () => {
    const p = generatePeriods(d('2026-02-01T00:00:00Z'), d('2026-11-01T00:00:00Z'), 'quarter')
    expect(p.map((x) => x.key)).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'])
    expect(p[1].label).toBe('Q2 2026')
  })
  it('generates yearly periods', () => {
    const p = generatePeriods(d('2024-05-01T00:00:00Z'), d('2026-02-01T00:00:00Z'), 'year')
    expect(p.map((x) => x.label)).toEqual(['2024', '2025', '2026'])
  })
})
