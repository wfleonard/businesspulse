import { parseCsv, parseMetricCsv } from '@/lib/metrics/csv'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })
  it('handles quoted fields with commas and escaped quotes', () => {
    const out = parseCsv('name,note\n"Doe, Jane","she said ""hi"""')
    expect(out).toEqual([
      ['name', 'note'],
      ['Doe, Jane', 'she said "hi"'],
    ])
  })
  it('handles newlines inside quotes and CRLF', () => {
    const out = parseCsv('a,b\r\n"line1\nline2",x')
    expect(out).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ])
  })
})

describe('parseMetricCsv', () => {
  const header = 'metric_key,period_start,period_end,value'

  it('parses valid rows', () => {
    const csv = `${header}\nrevenue,2026-06-01,2026-06-30,12000\njobs,2026-06-01,2026-06-30,42`
    const res = parseMetricCsv(csv)
    expect(res.errors).toHaveLength(0)
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0].metricKey).toBe('revenue')
    expect(res.rows[0].value).toBe(12000)
    expect(res.rows[0].periodStart).toBeInstanceOf(Date)
  })

  it('is order-independent and case-insensitive on headers', () => {
    const csv = `Value,Metric_Key,Period_End,Period_Start\n99,visits,2026-06-30,2026-06-01`
    const res = parseMetricCsv(csv)
    expect(res.rows[0]).toMatchObject({ metricKey: 'visits', value: 99 })
  })

  it('captures dimension:<name> columns', () => {
    const csv = `${header},dimension:region\nsales,2026-06-01,2026-06-30,500,West`
    const res = parseMetricCsv(csv)
    expect(res.rows[0].dimensions).toEqual({ region: 'West' })
  })

  it('reports missing required columns', () => {
    const res = parseMetricCsv('metric_key,value\nx,1')
    expect(res.rows).toHaveLength(0)
    expect(res.errors[0].message).toMatch(/Missing required column/)
  })

  it('reports bad value and bad date per line', () => {
    const csv = `${header}\nrevenue,2026-06-01,2026-06-30,notanumber`
    const res = parseMetricCsv(csv)
    expect(res.rows).toHaveLength(0)
    expect(res.errors[0].line).toBe(2)
  })

  it('rejects period_end before period_start', () => {
    const csv = `${header}\nrevenue,2026-06-30,2026-06-01,100`
    const res = parseMetricCsv(csv)
    expect(res.errors[0].message).toMatch(/before period_start/)
  })

  it('handles an empty file', () => {
    expect(parseMetricCsv('').errors[0].message).toBe('Empty file')
  })
})
