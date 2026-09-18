/** @jest-environment node */
import robots, { AI_RETRIEVAL_BOTS, PRIVATE_PATHS } from '@/app/robots'
import sitemap from '@/app/sitemap'
import { bookingUrl } from '../booking'

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

  it('lists only public pages, on the configured domain', () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(urls).toEqual(['https://businesspulse.app/', 'https://businesspulse.app/privacy'])
    for (const url of urls) {
      const path = new URL(url).pathname
      expect(PRIVATE_PATHS.some((p) => path.startsWith(p))).toBe(false)
    }
  })
})
