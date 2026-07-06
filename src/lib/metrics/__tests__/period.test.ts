import {
  computeDelta,
  sentimentOf,
  formatValue,
  formatPct,
  formatPeriodRange,
} from '@/lib/metrics/period'

describe('sentimentOf', () => {
  it('up_good: increase is good, decrease is bad', () => {
    expect(sentimentOf(5, 'up_good')).toBe('good')
    expect(sentimentOf(-5, 'up_good')).toBe('bad')
  })
  it('down_good: decrease is good, increase is bad', () => {
    expect(sentimentOf(-5, 'down_good')).toBe('good')
    expect(sentimentOf(5, 'down_good')).toBe('bad')
  })
  it('zero or null is neutral', () => {
    expect(sentimentOf(0, 'up_good')).toBe('neutral')
    expect(sentimentOf(null, 'up_good')).toBe('neutral')
  })
})

describe('computeDelta', () => {
  it('computes absolute and percent', () => {
    const d = computeDelta(112, 100, 'up_good')
    expect(d.absolute).toBe(12)
    expect(d.pct).toBeCloseTo(12)
    expect(d.sentiment).toBe('good')
  })
  it('uses |previous| for percent so a drop is negative', () => {
    const d = computeDelta(88, 100, 'up_good')
    expect(d.absolute).toBe(-12)
    expect(d.pct).toBeCloseTo(-12)
    expect(d.sentiment).toBe('bad')
  })
  it('null percent when previous is 0', () => {
    const d = computeDelta(10, 0, 'up_good')
    expect(d.absolute).toBe(10)
    expect(d.pct).toBeNull()
  })
  it('neutral when a value is missing', () => {
    expect(computeDelta(10, null, 'up_good').sentiment).toBe('neutral')
    expect(computeDelta(null, 10, 'up_good').absolute).toBeNull()
  })
})

describe('formatValue', () => {
  it('formats currency', () => {
    expect(formatValue(1200, '$')).toBe('$1,200')
    expect(formatValue(1200.5, 'usd')).toBe('$1,200.50')
  })
  it('formats percent', () => {
    expect(formatValue(12.5, '%')).toBe('12.5%')
  })
  it('formats plain numbers with unit suffix', () => {
    expect(formatValue(42, 'jobs')).toBe('42 jobs')
    expect(formatValue(1000, null)).toBe('1,000')
  })
  it('handles null', () => {
    expect(formatValue(null, '$')).toBe('—')
  })
})

describe('formatPct', () => {
  it('adds a sign', () => {
    expect(formatPct(12.34)).toBe('+12.3%')
    expect(formatPct(-8)).toBe('−8%')
    expect(formatPct(null)).toBe('—')
  })
})

describe('formatPeriodRange', () => {
  it('formats a range', () => {
    const s = new Date('2026-06-01T00:00:00Z')
    const e = new Date('2026-06-30T00:00:00Z')
    expect(formatPeriodRange(s, e)).toMatch(/2026/)
  })
  it('handles nulls', () => {
    expect(formatPeriodRange(null, null)).toBe('—')
  })
})
