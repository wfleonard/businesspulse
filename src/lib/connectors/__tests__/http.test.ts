import { authHeaders, buildUrl } from '@/lib/connectors/http'
import { endpointSchema } from '@/lib/connectors/config'

describe('authHeaders', () => {
  it('none -> empty', () => {
    expect(authHeaders({ type: 'none' })).toEqual({})
  })
  it('apiKey -> custom header', () => {
    expect(authHeaders({ type: 'apiKey', header: 'X-Api-Key', key: 'abc' })).toEqual({
      'X-Api-Key': 'abc',
    })
  })
  it('bearer -> Authorization', () => {
    expect(authHeaders({ type: 'bearer', token: 't' })).toEqual({
      Authorization: 'Bearer t',
    })
  })
  it('basic -> base64 Authorization', () => {
    const h = authHeaders({ type: 'basic', username: 'u', password: 'p' })
    expect(h.Authorization).toBe('Basic ' + Buffer.from('u:p').toString('base64'))
  })
})

describe('buildUrl', () => {
  const ep = (p: Record<string, unknown>) =>
    endpointSchema.parse({ path: '/x', mappings: [{ metricKey: 'k', valuePath: 'v', periodStartPath: 'd' }], ...p })

  it('joins base and path, trimming slashes', () => {
    expect(buildUrl('https://api.test/', ep({ path: '/metrics' }))).toBe(
      'https://api.test/metrics'
    )
    expect(buildUrl('https://api.test', ep({ path: 'metrics' }))).toBe(
      'https://api.test/metrics'
    )
  })
  it('appends query params', () => {
    const url = buildUrl('https://api.test', ep({ path: '/m', query: { from: '2026-01-01' } }))
    expect(url).toBe('https://api.test/m?from=2026-01-01')
  })
})
