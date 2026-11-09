/** @jest-environment node */
import Stripe from 'stripe'

jest.mock('@/lib/db', () => ({ db: {} }))
const handleMock = jest.fn()
jest.mock('@/lib/aeo/payments', () => {
  const actual = jest.requireActual('@/lib/aeo/payments')
  return { ...actual, handleStripeEvent: (...args: unknown[]) => handleMock(...args) }
})

import { PULSE_MIN_DAYS, pulsePriceCents, pulseState, pulseTaxCode, stripeConfigured } from '../payments'
import { POST } from '@/app/api/stripe/webhook/route'

describe('pulseState', () => {
  const base = { briefStatus: 'confirmed', hasApprovedPanel: true, activeRun: null, lastPaidRunAt: null }
  const now = new Date('2026-11-09T12:00:00Z')

  it('walks a new client through reading, confirming, and preparing before they can buy', () => {
    expect(pulseState({ ...base, briefStatus: null }).kind).toBe('reading')
    expect(pulseState({ ...base, briefStatus: 'reading' }).kind).toBe('reading')
    expect(pulseState({ ...base, briefStatus: 'ready' }).kind).toBe('confirm_brief')
    expect(pulseState({ ...base, hasApprovedPanel: false }).kind).toBe('preparing')
    expect(pulseState({ ...base, now }).kind).toBe('ready')
  })

  it('never sells a second run while one is going', () => {
    expect(pulseState({ ...base, activeRun: { publicId: 'abc' } })).toEqual({ kind: 'running', publicId: 'abc' })
  })

  it('allows one paid run every 30 days, counted from the start of the last one', () => {
    const lastPaidRunAt = new Date('2026-10-20T12:00:00Z')
    expect(pulseState({ ...base, lastPaidRunAt, now })).toEqual({
      kind: 'too_soon',
      nextDate: new Date(lastPaidRunAt.getTime() + PULSE_MIN_DAYS * 86_400_000),
    })
    expect(pulseState({ ...base, lastPaidRunAt, now: new Date('2026-11-19T12:00:01Z') }).kind).toBe('ready')
  })
})

describe('settings', () => {
  it('prices at $100 unless set, and needs both Stripe secrets', () => {
    expect(pulsePriceCents({})).toBe(10_000)
    expect(pulsePriceCents({ PULSE_PRICE_CENTS: '12500' })).toBe(12_500)
    expect(pulsePriceCents({ PULSE_PRICE_CENTS: 'free' })).toBe(10_000)
    expect(stripeConfigured({ STRIPE_SECRET_KEY: 'sk_test_x' })).toBe(false)
    expect(stripeConfigured({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x' })).toBe(true)
  })

  it('uses a valid tax code and ignores a malformed one, so a typo cannot block checkout', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(pulseTaxCode({ STRIPE_PULSE_TAX_CODE: ' txcd_10000000 ' })).toBe('txcd_10000000')
    expect(pulseTaxCode({})).toBeUndefined()
    expect(pulseTaxCode({ STRIPE_PULSE_TAX_CODE: '10000' })).toBeUndefined()
    expect(pulseTaxCode({ STRIPE_PULSE_TAX_CODE: 'txcd_1000' })).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})

describe('POST /api/stripe/webhook', () => {
  const secret = 'whsec_test_secret'
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'checkout.session.expired', data: { object: { id: 'cs_1' } } })
  const request = (body: string, signature?: string) =>
    new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body,
      headers: signature ? { 'stripe-signature': signature } : {},
    })

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit'
    process.env.STRIPE_WEBHOOK_SECRET = secret
    handleMock.mockReset().mockResolvedValue({ handled: true, note: 'ok' })
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('applies an event signed with the webhook secret', async () => {
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret })
    const res = await POST(request(payload, signature))
    expect(res.status).toBe(200)
    expect(handleMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'evt_1', type: 'checkout.session.expired' }))
  })

  it('refuses unsigned, wrongly signed, and tampered requests without touching anything', async () => {
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret })
    expect((await POST(request(payload))).status).toBe(400)
    expect((await POST(request(payload, Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' })))).status).toBe(400)
    expect((await POST(request(payload.replace('cs_1', 'cs_2'), signature))).status).toBe(400)
    expect(handleMock).not.toHaveBeenCalled()
  })

  it('answers 500 when handling fails, so Stripe retries', async () => {
    handleMock.mockRejectedValue(new Error('database down'))
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret })
    expect((await POST(request(payload, signature))).status).toBe(500)
  })
})
