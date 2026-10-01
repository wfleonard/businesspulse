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
