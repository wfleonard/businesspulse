/** @jest-environment node */
import robots, { AI_RETRIEVAL_BOTS, PRIVATE_PATHS } from '@/app/robots'
import sitemap from '@/app/sitemap'
import { benchmarkAvailability } from '@/lib/resources/benchmarks'
import { bookingUrl } from '../booking'

jest.mock('@/lib/resources/benchmarks', () => ({ benchmarkAvailability: jest.fn() }))
const mockedAvailability = benchmarkAvailability as jest.MockedFunction<typeof benchmarkAvailability>

beforeEach(() => {
  mockedAvailability.mockResolvedValue([
    { slug: 'commercial-roofing', name: 'Commercial roofing', businesses: 12, available: true, lastMeasured: new Date('2026-09-18') },
    { slug: 'landscaping', name: 'Landscaping & lawn care', businesses: 3, available: false, lastMeasured: new Date('2026-09-18') },
  ])
})

describe('bookingUrl', () => {
  it('accepts an https booking page', () => {
    expect(bookingUrl({ AEO_BOOKING_URL: ' https://calendly.com/saxon/20min ' })).toBe('https://calendly.com/saxon/20min')
  })

  it.each([undefined, '', '   ', 'http://calendly.com/x', 'javascript:alert(1)', 'mailto:a@b.com', 'not a url'])(
    'rejects %p',
    (value) => {
      expect(bookingUrl({ AEO_BOOKING_URL: value })).toBeNull()
    }
  )
})

describe('robots and sitemap', () => {
  const saved = process.env.BETTER_AUTH_URL
  beforeAll(() => {
    process.env.BETTER_AUTH_URL = 'https://businesspulse.app'
  })
  afterAll(() => {
    process.env.BETTER_AUTH_URL = saved
  })

  it('names the AI search crawlers and allows them the public site', () => {
    const rules = [robots().rules].flat()
    const ai = rules.find((r) => Array.isArray(r.userAgent) && r.userAgent.includes('PerplexityBot'))!
    expect(ai.allow).toBe('/')
    for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot']) {
      expect(AI_RETRIEVAL_BOTS).toContain(bot)
    }
  })

  it('keeps private pages out for every crawler', () => {
    for (const rule of [robots().rules].flat()) {
      for (const path of ['/dashboard', '/report/', '/check/', '/book', '/api/']) {
        expect(rule.disallow).toContain(path)
      }
    }
  })

  it('points at the sitemap on the configured domain', () => {
    expect(robots().sitemap).toBe('https://businesspulse.app/sitemap.xml')
  })

  const paths = async () =>
    (await sitemap()).map((entry) => {
      expect(entry.url.startsWith('https://businesspulse.app/')).toBe(true)
      return new URL(entry.url).pathname
    })

  it('lists public pages, published articles, and only benchmarks with enough data', async () => {
    const urls = await paths()
    expect(urls).toEqual(
      expect.arrayContaining([
        '/',
        '/resources',
        '/privacy',
        '/resources/what-is-aeo',
        '/resources/benchmarks/commercial-roofing',
      ])
    )
    expect(urls).not.toContain('/resources/benchmarks/landscaping')
    for (const path of urls) expect(PRIVATE_PATHS.some((p) => path.startsWith(p))).toBe(false)
  })

  it('still lists the fixed pages when the database is down', async () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockedAvailability.mockRejectedValueOnce(new Error('database down'))
    try {
      const urls = await paths()
      expect(urls).toContain('/resources')
      expect(urls.some((p) => p.startsWith('/resources/benchmarks/'))).toBe(false)
    } finally {
      quiet.mockRestore()
    }
  })
})
