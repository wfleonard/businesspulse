import { normalizeEndpoint } from '@/lib/connectors/normalize'
import { endpointSchema } from '@/lib/connectors/config'

function ep(partial: unknown) {
  return endpointSchema.parse(partial)
}

describe('normalizeEndpoint', () => {
  it('maps an array of rows to values', () => {
    const endpoint = ep({
      path: '/metrics',
      mappings: [
        {
          metricKey: 'monthly_revenue',
          valuePath: 'amount',
          periodStartPath: 'start',
          periodEndPath: 'end',
        },
      ],
    })
    const resp = [
      { amount: 1000, start: '2026-01-01', end: '2026-01-31' },
      { amount: 1200, start: '2026-02-01', end: '2026-02-28' },
    ]
    const { values, errors } = normalizeEndpoint(resp, endpoint)
    expect(errors).toHaveLength(0)
    expect(values).toHaveLength(2)
    expect(values[0]).toMatchObject({ metricKey: 'monthly_revenue', value: 1000 })
    expect(values[0].periodStart).toBeInstanceOf(Date)
    expect(values[0].periodEnd.getUTCDate()).toBe(31)
  })

  it('reads rows from a nested rowsPath', () => {
    const endpoint = ep({
      path: '/m',
      rowsPath: 'data.items',
      mappings: [{ metricKey: 'jobs', valuePath: 'count', periodStartPath: 'date' }],
    })
    const resp = { data: { items: [{ count: 42, date: '2026-06-30' }] } }
    const { values } = normalizeEndpoint(resp, endpoint)
    expect(values[0]).toMatchObject({ metricKey: 'jobs', value: 42 })
    // periodEnd defaults to periodStart when no periodEndPath.
    expect(values[0].periodEnd.getTime()).toBe(values[0].periodStart.getTime())
  })

  it('coerces currency-like strings to numbers', () => {
    const endpoint = ep({
      path: '/m',
      mappings: [{ metricKey: 'revenue', valuePath: 'v', periodStartPath: 'd' }],
    })
    const { values } = normalizeEndpoint([{ v: '$1,250.50', d: '2026-06-01' }], endpoint)
    expect(values[0].value).toBeCloseTo(1250.5)
  })

  it('captures dimensions', () => {
    const endpoint = ep({
      path: '/m',
      mappings: [
        {
          metricKey: 'sales',
          valuePath: 'v',
          periodStartPath: 'd',
          dimensions: { region: 'region', rep: 'rep.name' },
        },
      ],
    })
    const { values } = normalizeEndpoint(
      [{ v: 5, d: '2026-06-01', region: 'West', rep: { name: 'Sam' } }],
      endpoint
    )
    expect(values[0].dimensions).toEqual({ region: 'West', rep: 'Sam' })
  })

  it('records per-row errors without dropping good rows', () => {
    const endpoint = ep({
      path: '/m',
      mappings: [{ metricKey: 'revenue', valuePath: 'v', periodStartPath: 'd' }],
    })
    const resp = [
      { v: 100, d: '2026-06-01' },
      { v: 'oops', d: '2026-06-02' },
      { v: 200, d: 'not-a-date' },
    ]
    const { values, errors } = normalizeEndpoint(resp, endpoint)
    expect(values).toHaveLength(1)
    expect(values[0].value).toBe(100)
    expect(errors).toHaveLength(2)
  })

  it('aggregate:count buckets rows into periods (e.g. campaigns/month)', () => {
    const endpoint = ep({
      path: '/campaigns',
      mappings: [
        {
          metricKey: 'campaigns_sent',
          aggregate: 'count',
          periodStartPath: 'sentDate',
          periodGranularity: 'month',
        },
      ],
    })
    const resp = [
      { id: 1, sentDate: '2026-06-02T10:00:00Z' },
      { id: 2, sentDate: '2026-06-20T10:00:00Z' },
      { id: 3, sentDate: '2026-07-05T10:00:00Z' },
      { id: 4, sentDate: null }, // unsent draft — skipped
    ]
    const { values, errors } = normalizeEndpoint(resp, endpoint)
    const byMonth = Object.fromEntries(
      values.map((v) => [v.periodStart.toISOString().slice(0, 7), v.value])
    )
    expect(byMonth['2026-06']).toBe(2)
    expect(byMonth['2026-07']).toBe(1)
    expect(errors).toHaveLength(1) // the null date
    // period end is end-of-month
    const june = values.find((v) => v.periodStart.toISOString().startsWith('2026-06'))!
    expect(june.periodEnd.getUTCDate()).toBe(30)
  })

  it('filter keeps only matching rows before mapping', () => {
    const endpoint = ep({
      path: '/campaigns',
      filter: [{ path: 'status', equals: 'Sent' }],
      mappings: [
        { metricKey: 'campaigns_sent', aggregate: 'count', periodStartPath: 'sentDate', periodGranularity: 'month' },
      ],
    })
    const resp = [
      { status: 'Sent', sentDate: '2026-06-01' },
      { status: 'Sent', sentDate: '2026-06-10' },
      { status: 'Draft', sentDate: '0001-01-01' },
    ]
    const { values } = normalizeEndpoint(resp, endpoint)
    expect(values).toHaveLength(1)
    expect(values[0].value).toBe(2)
  })

  it('aggregate:sum totals valuePath per period', () => {
    const endpoint = ep({
      path: '/orders',
      mappings: [
        {
          metricKey: 'order_revenue',
          aggregate: 'sum',
          valuePath: 'total',
          periodStartPath: 'date',
          periodGranularity: 'month',
        },
      ],
    })
    const resp = [
      { total: 100, date: '2026-06-01' },
      { total: 250, date: '2026-06-15' },
      { total: 50, date: '2026-07-01' },
    ]
    const { values } = normalizeEndpoint(resp, endpoint)
    const byMonth = Object.fromEntries(
      values.map((v) => [v.periodStart.toISOString().slice(0, 7), v.value])
    )
    expect(byMonth['2026-06']).toBe(350)
    expect(byMonth['2026-07']).toBe(50)
  })

  it('reports empty responses', () => {
    const endpoint = ep({
      path: '/m',
      rowsPath: 'data.items',
      mappings: [{ metricKey: 'x', valuePath: 'v', periodStartPath: 'd' }],
    })
    const { values, errors } = normalizeEndpoint({ data: { items: [] } }, endpoint)
    expect(values).toHaveLength(0)
    expect(errors[0]).toMatch(/No rows/)
  })
})
