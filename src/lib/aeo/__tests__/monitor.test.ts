/** @jest-environment node */
import { monitorOfferEnabled, offersMonitor } from '../monitor'

jest.mock('@/lib/db', () => ({ db: {} }))

describe('Monitor demand test', () => {
  it('offers Monitor by default, with an off switch', () => {
    expect(monitorOfferEnabled({})).toBe(true)
    expect(monitorOfferEnabled({ AEO_MONITOR_OFFER: 'true' })).toBe(true)
    expect(monitorOfferEnabled({ AEO_MONITOR_OFFER: ' FALSE ' })).toBe(false)
  })

  it('offers it only on public-form reports, never on outbound prospect snapshots', () => {
    expect(offersMonitor('form', {})).toBe(true)
    expect(offersMonitor('outbound', {})).toBe(false)
    expect(offersMonitor(null, {})).toBe(false)
    expect(offersMonitor('form', { AEO_MONITOR_OFFER: 'false' })).toBe(false)
  })
})

describe('Pulse launch email to the Monitor waitlist', () => {
  // Imported here so the db mock above is in place.
  const { pulseLaunchEmail } = jest.requireActual('@/lib/access/emails') as typeof import('@/lib/access/emails')

  it('names the business, the price, and Pulse, and promises no more email about Monitor', () => {
    process.env.BETTER_AUTH_URL = 'https://businesspulse.app'
    const email = pulseLaunchEmail({ domain: 'acme.com' })
    expect(email.subject).toBe('BusinessPulse Pulse is open')
    expect(email.text).toContain('Monitor opened for acme.com')
    expect(email.text).toContain('$100 per report')
    expect(email.text).toContain('See how Pulse works: https://businesspulse.app/pulse')
    expect(email.text).toContain("We won't write to you about Monitor again.")
  })
})
