import { rateLimit, clientIp } from '@/lib/rate-limit'
import { getRedis } from '@/lib/redis'

jest.mock('@/lib/redis', () => ({ getRedis: jest.fn() }))

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>

function fakeRedis(count: number) {
  return {
    incr: jest.fn().mockResolvedValue(count),
    expire: jest.fn().mockResolvedValue(1),
  } as unknown as ReturnType<typeof getRedis>
}

describe('rateLimit', () => {
  afterEach(() => jest.clearAllMocks())

  it('allows requests under the limit', async () => {
    mockedGetRedis.mockReturnValue(fakeRedis(1))
    const r = await rateLimit('k', 5, 60)
    expect(r.success).toBe(true)
    expect(r.remaining).toBe(4)
  })

  it('blocks requests over the limit', async () => {
    mockedGetRedis.mockReturnValue(fakeRedis(6))
    const r = await rateLimit('k', 5, 60)
    expect(r.success).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('fails open when Redis throws', async () => {
    mockedGetRedis.mockImplementation(() => {
      throw new Error('down')
    })
    const r = await rateLimit('k', 5, 60)
    expect(r.success).toBe(true)
  })
})

describe('clientIp', () => {
  it('reads the first x-forwarded-for entry', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(clientIp(h)).toBe('1.2.3.4')
  })

  it('falls back to unknown', () => {
    expect(clientIp(new Headers())).toBe('unknown')
  })
})
