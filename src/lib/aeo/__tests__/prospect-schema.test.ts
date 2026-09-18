/** @jest-environment node */
import { parseLeadFilters, filtersToQuery } from '../lead-filters'
import { fieldErrors, prospectRequestSchema } from '../request-schema'

const valid = {
  businessName: ' Green Apple Roofing ',
  website: 'https://www.greenappleroofing.com/',
  service: 'commercial roofing',
  city: 'Ocean Township',
  state: 'nj',
  vertical: 'commercial-roofing',
}

describe('prospectRequestSchema', () => {
  it('normalizes a prospect without an email', () => {
    expect(prospectRequestSchema.parse(valid)).toEqual({
      businessName: 'Green Apple Roofing',
      website: 'greenappleroofing.com',
      service: 'commercial roofing',
      city: 'Ocean Township',
      state: 'NJ',
      vertical: 'commercial-roofing',
      email: '',
    })
  })

  it('treats a blank email as none and keeps a valid one', () => {
    expect(prospectRequestSchema.parse({ ...valid, email: '   ' }).email).toBe('')
    expect(prospectRequestSchema.parse({ ...valid, email: ' Owner@Example.com ' }).email).toBe('owner@example.com')
  })

  it('rejects a bad email and the same bad input the public form rejects', () => {
    const result = prospectRequestSchema.safeParse({ ...valid, email: 'nope', website: 'localhost', state: 'ZZ' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(fieldErrors(result.error)).toEqual({
      email: 'Enter a valid email address',
      website: 'Enter your website, like example.com',
      state: 'Choose a state',
    })
  })

  it('ignores fields the dashboard form does not send', () => {
    const parsed = prospectRequestSchema.parse({ ...valid, contactConsent: 'on', turnstileToken: 'x' })
    expect(parsed).not.toHaveProperty('contactConsent')
    expect(parsed).not.toHaveProperty('turnstileToken')
  })
})

describe('lead source filter', () => {
  it('parses and round-trips the source', () => {
    expect(parseLeadFilters({ source: 'outbound' })).toEqual({ source: 'outbound' })
    expect(parseLeadFilters({ source: 'spam' })).toEqual({})
    expect(filtersToQuery({ source: 'form' })).toBe('?source=form')
  })
})
