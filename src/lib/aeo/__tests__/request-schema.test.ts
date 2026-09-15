/** @jest-environment node */
import { fieldErrors, snapshotRequestSchema } from '../request-schema'

const valid = {
  businessName: '  East Coast Utility  ',
  website: 'https://www.EastCoastUtility.com/',
  service: 'directional drilling',
  city: 'Fair Haven',
  state: 'nj',
  vertical: 'hdd-trenchless',
  email: ' Owner@Example.COM ',
  contactConsent: true,
  turnstileToken: 'tok',
}

describe('snapshotRequestSchema', () => {
  it('trims and normalizes a valid request', () => {
    const parsed = snapshotRequestSchema.parse(valid)
    expect(parsed).toEqual({
      businessName: 'East Coast Utility',
      website: 'eastcoastutility.com',
      service: 'directional drilling',
      city: 'Fair Haven',
      state: 'NJ',
      vertical: 'hdd-trenchless',
      email: 'owner@example.com',
      contactConsent: true,
      turnstileToken: 'tok',
    })
  })

  it('defaults consent to false and vertical to other', () => {
    const { contactConsent, vertical, turnstileToken, ...rest } = valid
    void contactConsent
    void vertical
    void turnstileToken
    const parsed = snapshotRequestSchema.parse(rest)
    expect(parsed.contactConsent).toBe(false)
    expect(parsed.vertical).toBe('other')
    expect(parsed.turnstileToken).toBe('')
  })

  it('reports one friendly message per invalid field', () => {
    const result = snapshotRequestSchema.safeParse({
      ...valid,
      businessName: ' ',
      website: 'localhost',
      state: 'ZZ',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(fieldErrors(result.error)).toEqual({
      businessName: 'Business name is required',
      website: 'Enter your website, like example.com',
      state: 'Choose a state',
      email: 'Enter a valid email address',
    })
  })

  it('rejects a missing field and a non-boolean consent', () => {
    const { city, ...noCity } = valid
    void city
    const result = snapshotRequestSchema.safeParse({ ...noCity, contactConsent: 'yes' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(['city', 'contactConsent'])
  })
})
