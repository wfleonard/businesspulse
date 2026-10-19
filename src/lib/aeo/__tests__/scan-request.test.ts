/** @jest-environment node */
import { withAnalytics } from '@/lib/scan-page'
import { adminScanRequestEmail } from '../emails'
import { scanRequestSchema } from '../request-schema'

describe('scan request form', () => {
  it('accepts the three fields and normalizes the website', () => {
    const parsed = scanRequestSchema.parse({
      businessName: ' Shore Roofing ',
      website: 'https://www.ShoreRoofing.com/about',
      email: ' Owner@ShoreRoofing.com ',
    })
    expect(parsed).toEqual({ businessName: 'Shore Roofing', website: 'shoreroofing.com', email: 'owner@shoreroofing.com' })
  })

  it('rejects a missing name, a bad website, or a bad email', () => {
    expect(scanRequestSchema.safeParse({ businessName: '', website: 'shore.com', email: 'a@b.com' }).success).toBe(false)
    expect(scanRequestSchema.safeParse({ businessName: 'Shore', website: 'not a site', email: 'a@b.com' }).success).toBe(false)
    expect(scanRequestSchema.safeParse({ businessName: 'Shore', website: 'shore.com', email: 'nope' }).success).toBe(false)
  })
})

describe('admin scan request email', () => {
  it('escapes what the visitor typed and links to a pre-filled snapshot form', () => {
    const saved = process.env.BETTER_AUTH_URL
    process.env.BETTER_AUTH_URL = 'https://businesspulse.app'
    try {
      const email = adminScanRequestEmail({ businessName: '<b>Shore</b>', domain: 'shore.com', email: 'a@b.com' })
      expect(email.html).not.toContain('<b>Shore</b>')
      expect(email.html).toContain('&lt;b&gt;Shore&lt;/b&gt;')
      expect(email.text).toContain('https://businesspulse.app/dashboard/aeo/new?businessName=%3Cb%3EShore%3C%2Fb%3E&website=shore.com&email=a%40b.com')
    } finally {
      process.env.BETTER_AUTH_URL = saved
    }
  })
})

describe('/scan analytics', () => {
  const page = '<!doctype html><html><head><title>Scan</title></head><body></body></html>'

  it('adds the GA4 tag inside <head> when there is an ID', () => {
    const html = withAnalytics(page, 'G-9LM5D025CR')
    expect(html.indexOf('googletagmanager.com/gtag/js?id=G-9LM5D025CR')).toBeLessThan(html.indexOf('</head>'))
    expect(html).toContain("gtag('config', 'G-9LM5D025CR')")
  })

  it('leaves the page alone without one', () => {
    expect(withAnalytics(page, null)).toBe(page)
  })
})
