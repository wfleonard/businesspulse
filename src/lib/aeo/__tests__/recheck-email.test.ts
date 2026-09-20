/** @jest-environment node */
import { compareCited, recheckEmail } from '../emails'

describe('compareCited', () => {
  it('says which way the score moved', () => {
    expect(compareCited('acme.com', { cited: 1, total: 20 }, { cited: 3, total: 20 })).toBe(
      'AI search now cites acme.com on 3 of 20 questions, up from 1 of 20 a month ago.'
    )
    expect(compareCited('acme.com', { cited: 4, total: 20 }, { cited: 2, total: 20 })).toBe(
      'AI search now cites acme.com on 2 of 20 questions, down from 4 of 20 a month ago.'
    )
    expect(compareCited('acme.com', { cited: 0, total: 20 }, { cited: 0, total: 19 })).toBe(
      'AI search now cites acme.com on 0 of 19 questions, the same as a month ago.'
    )
  })
})

describe('recheckEmail', () => {
  const email = recheckEmail({
    businessName: '<b>Acme</b> Roofing',
    domain: 'acme.com',
    before: { cited: 1, total: 20 },
    after: { cited: 3, total: 20 },
    reportUrl: 'https://businesspulse.app/report/abc',
    unsubscribeUrl: 'https://businesspulse.app/check/unsubscribe?token=xyz',
    postalAddress: '1 Example Street, Fair Haven, NJ 07704',
  })

  it('leads with the comparison and links the new report', () => {
    expect(email.subject).toBe('A month on: AI search and acme.com')
    expect(email.text).toContain('up from 1 of 20 a month ago')
    expect(email.text).toContain('https://businesspulse.app/report/abc')
  })

  it('always carries an unsubscribe link, and the address when given', () => {
    expect(email.text).toContain('Unsubscribe: https://businesspulse.app/check/unsubscribe?token=xyz')
    expect(email.html).toContain('/check/unsubscribe?token=xyz')
    expect(email.text).toContain('1 Example Street, Fair Haven, NJ 07704')
  })

  it('omits the address when there is none', () => {
    const without = recheckEmail({
      businessName: 'Acme',
      domain: 'acme.com',
      before: { cited: 1, total: 20 },
      after: { cited: 1, total: 20 },
      reportUrl: 'https://businesspulse.app/report/abc',
      unsubscribeUrl: 'https://businesspulse.app/check/unsubscribe?token=xyz',
    })
    expect(without.text).not.toContain('Example Street')
    expect(without.text).toContain('Unsubscribe:')
  })

  it('escapes the business name and uses no em dashes', () => {
    expect(email.html).not.toContain('<b>Acme</b>')
    expect(email.html).toContain('&lt;b&gt;Acme&lt;/b&gt;')
    expect(`${email.subject}${email.html}${email.text}`).not.toContain('—')
  })
})
