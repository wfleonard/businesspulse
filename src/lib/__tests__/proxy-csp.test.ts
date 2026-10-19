/** @jest-environment node */
import { buildCsp } from '@/proxy'

describe('content security policy', () => {
  it('blocks Google Fonts by default', () => {
    const csp = buildCsp(true)
    expect(csp).not.toContain('fonts.googleapis.com')
    expect(csp).not.toContain('fonts.gstatic.com')
  })

  it('allows Google Fonts only where asked, for styles and font files', () => {
    const csp = buildCsp(true, { googleFonts: true })
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
    expect(csp).toContain("font-src 'self' data: https://fonts.gstatic.com")
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
  })
})
