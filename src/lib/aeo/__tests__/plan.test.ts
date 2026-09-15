/** @jest-environment node */
import { buildCannedPlan, PermanentRunError } from '../plan'
import { stateInfo } from '../states'

const panel = {
  questions: [
    { c: 'service-geo', q: '{service} contractor in {state}' },
    { c: 'permits', q: 'Do I need a {state_permit_agency} permit for {service}?' },
    { c: 'geo', q: '{business} reviews in {city}' },
  ],
  directoryDomains: ['yelp.com'],
  referenceDomains: ['nj.gov'],
  version: 3,
}

const request = {
  businessName: 'East Coast Utility, LLC',
  service: 'horizontal directional drilling',
  city: 'Fair Haven',
  state: 'nj',
}

describe('stateInfo', () => {
  it('names the specific permit agency where one is well known', () => {
    expect(stateInfo('NJ')).toEqual({ code: 'NJ', name: 'New Jersey', permitAgency: 'NJDOT' })
    expect(stateInfo('pa')?.permitAgency).toBe('PennDOT')
  })

  it('falls back to the generic department name', () => {
    expect(stateInfo('OH')?.permitAgency).toBe('Ohio Department of Transportation')
  })

  it('returns undefined for an unknown code', () => {
    expect(stateInfo('ZZ')).toBeUndefined()
  })
})

describe('buildCannedPlan', () => {
  it('fills slots from the request and carries the panel lists', () => {
    const plan = buildCannedPlan(panel, request, 'eastcoastutility.com', 20)
    expect(plan.questions).toEqual([
      { c: 'service-geo', q: 'horizontal directional drilling contractor in New Jersey' },
      { c: 'permits', q: 'Do I need a NJDOT permit for horizontal directional drilling?' },
      { c: 'geo', q: 'East Coast Utility, LLC reviews in Fair Haven' },
    ])
    expect(plan).toMatchObject({
      businessName: 'East Coast Utility, LLC',
      domain: 'eastcoastutility.com',
      directoryDomains: ['yelp.com'],
      referenceDomains: ['nj.gov'],
      panelVersion: 3,
    })
  })

  it('uses the raw state value when the code is unknown, and drops agency questions', () => {
    const plan = buildCannedPlan(panel, { ...request, state: 'Ontario' }, 'x.com', 20)
    expect(plan.questions.map((q) => q.c)).toEqual(['service-geo', 'geo'])
    expect(plan.questions[0].q).toContain('in Ontario')
  })

  it('fails permanently when no question can be filled', () => {
    const agencyOnly = { ...panel, questions: [{ c: 'permits', q: '{state_permit_agency} permit?' }] }
    expect(() => buildCannedPlan(agencyOnly, { ...request, state: 'Ontario' }, 'x.com', 20)).toThrow(
      PermanentRunError
    )
  })
})
