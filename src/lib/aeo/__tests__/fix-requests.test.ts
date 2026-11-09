/** @jest-environment node */
jest.mock('@/lib/db', () => ({ db: {} }))

import { adminFixRequestedEmail, fixDeclinedEmail, fixDoneEmail, fixQuotedEmail } from '@/lib/access/emails'
import { fixPriceCents, OPEN_FIX_STATUSES } from '../fix-requests'

describe('fix requests', () => {
  it('prices the fix at $500 unless set', () => {
    expect(fixPriceCents({})).toBe(50_000)
    expect(fixPriceCents({ FIX_PRICE_CENTS: '75000' })).toBe(75_000)
    expect(fixPriceCents({ FIX_PRICE_CENTS: 'lots' })).toBe(50_000)
  })

  it('treats requested, quoted, paid, and in-progress requests as open', () => {
    expect(OPEN_FIX_STATUSES).toEqual(['requested', 'quoted', 'paid', 'in_progress'])
  })
})

describe('fix emails', () => {
  beforeAll(() => {
    process.env.BETTER_AUTH_URL = 'https://businesspulse.app'
  })

  it('sends the admin to the request', () => {
    const email = adminFixRequestedEmail({ businessName: 'Primos', email: 'p@primos.com', issues: 8, id: 'abc' })
    expect(email.subject).toBe('[BusinessPulse] Fix requested: Primos')
    expect(email.text).toContain('https://businesspulse.app/dashboard/pulse/fix/abc')
  })

  it('tells the client the amount and scope, and sends them to their account to pay', () => {
    const email = fixQuotedEmail({ name: 'Pat', businessName: 'Primos', amountCents: 50_000, scope: '1. Add FAQ markup' })
    expect(email.text).toContain('$500, one time, plus sales tax for New Jersey buyers')
    expect(email.text).toContain('1. Add FAQ markup')
    expect(email.text).toContain('Review and pay: https://businesspulse.app/account')
    expect(email.html).not.toContain('<script')
  })

  it('escapes notes in the done and declined emails', () => {
    expect(fixDoneEmail({ name: 'Pat', businessName: 'Primos', note: '<b>done</b>' }).html).toContain('&lt;b&gt;done&lt;/b&gt;')
    expect(fixDeclinedEmail({ name: 'Pat', businessName: 'Primos', note: '' }).text).toContain("You haven't been charged.")
  })
})
