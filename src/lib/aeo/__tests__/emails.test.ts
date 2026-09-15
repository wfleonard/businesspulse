/** @jest-environment node */
import { adminRunFailedEmail, appUrl, escapeHtml, reportReadyEmail, verificationEmail } from '../emails'

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<b>"Tom's" & Co</b>`)).toBe('&lt;b&gt;&quot;Tom&#39;s&quot; &amp; Co&lt;/b&gt;')
  })
})

describe('appUrl', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('joins the configured base URL and path without doubling slashes', () => {
    process.env.BETTER_AUTH_URL = 'https://businesspulse.app/'
    expect(appUrl('/check/verify?token=abc')).toBe('https://businesspulse.app/check/verify?token=abc')
  })
})

describe('verificationEmail', () => {
  const email = verificationEmail({
    businessName: '<script>Acme</script>',
    domain: 'acme.com',
    verifyUrl: 'https://businesspulse.app/check/verify?token=abc&x=1',
  })

  it('carries the link in both parts', () => {
    expect(email.html).toContain('https://businesspulse.app/check/verify?token=abc&amp;x=1')
    expect(email.text).toContain('https://businesspulse.app/check/verify?token=abc&x=1')
    expect(email.subject).toContain('acme.com')
  })

  it('escapes the visitor-typed business name in HTML', () => {
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;Acme&lt;/script&gt;')
  })

  it('mentions the 24-hour expiry and uses no em dashes', () => {
    expect(email.text).toContain('24 hours')
    expect(`${email.subject}${email.html}${email.text}`).not.toContain('—')
  })
})

describe('reportReadyEmail', () => {
  it('includes the score line only when both counts are known', () => {
    const withScore = reportReadyEmail({
      businessName: 'Acme',
      domain: 'acme.com',
      reportUrl: 'https://businesspulse.app/report/x',
      citedCount: 3,
      questionCount: 20,
    })
    expect(withScore.text).toContain('cited acme.com on 3 of 20 buyer questions')

    const withoutScore = reportReadyEmail({
      businessName: 'Acme',
      domain: 'acme.com',
      reportUrl: 'https://businesspulse.app/report/x',
    })
    expect(withoutScore.text).not.toContain('of 20')
    expect(`${withoutScore.html}${withoutScore.text}`).not.toContain('—')
  })
})

describe('adminRunFailedEmail', () => {
  const email = adminRunFailedEmail({
    runId: 'run-1',
    publicId: 'pub-1',
    domain: 'acme.com',
    attempts: 3,
    panel: 'hdd-trenchless',
    error: 'panel exited with 1: <boom>',
    requests: [
      { businessName: 'Acme <LLC>', email: 'a@acme.com', service: 'drilling', location: 'Fair Haven, NJ', contactConsent: true },
    ],
  })

  it('names the domain and carries the error and waiting requests', () => {
    expect(email.subject).toBe('[BusinessPulse] Snapshot failed for acme.com')
    expect(email.text).toContain('Error: panel exited with 1: <boom>')
    expect(email.text).toContain('Acme <LLC> <a@acme.com>: drilling, Fair Haven, NJ (consented to contact)')
  })

  it('escapes everything in the HTML part', () => {
    expect(email.html).not.toContain('<boom>')
    expect(email.html).toContain('&lt;boom&gt;')
    expect(email.html).toContain('Acme &lt;LLC&gt;')
  })

  it('says so when no request is waiting', () => {
    const none = adminRunFailedEmail({ runId: 'r', publicId: 'p', domain: 'x.com', attempts: 1, panel: '(generated)', error: 'e', requests: [] })
    expect(none.text).toContain('(none)')
  })
})
