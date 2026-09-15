/** @jest-environment node */
import { normalizeDomain } from '../domain'
import { CANNED_PANELS } from '../panels'
import { buildCannedPlan } from '../plan'
import { CATEGORY_MINIMUMS } from '../questions'

const KNOWN_SLOTS = new Set(['business', 'service', 'city', 'state', 'state_permit_agency'])

const request = (state: string) => ({
  businessName: 'East Coast Utility, LLC',
  service: 'horizontal directional drilling',
  city: 'Fair Haven',
  state,
})

describe.each(CANNED_PANELS.map((panel) => [panel.slug, panel] as const))('canned panel %s', (_slug, panel) => {
  it('has a URL-safe slug and a name', () => {
    expect(panel.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(panel.name.trim()).not.toBe('')
  })

  it('has unique, reasonably short questions using only known slots', () => {
    const texts = panel.questions.map((q) => q.q.toLowerCase())
    expect(new Set(texts).size).toBe(texts.length)
    for (const { q, c } of panel.questions) {
      expect(c).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
      expect(q.length).toBeLessThanOrEqual(150)
      for (const [, slot] of q.matchAll(/\{([a-z_]+)\}/g)) expect(KNOWN_SLOTS.has(slot)).toBe(true)
    }
  })

  it('stores domain lists already normalized and without duplicates', () => {
    for (const list of [panel.directoryDomains, panel.referenceDomains]) {
      expect(new Set(list).size).toBe(list.length)
      for (const domain of list) expect(normalizeDomain(domain)).toBe(domain)
    }
  })

  it.each(['NJ', 'OH', 'Ontario'])('samples a full, balanced snapshot for state %s', (state) => {
    const plan = buildCannedPlan(
      { ...panel, version: 1 },
      request(state),
      'eastcoastutility.com',
      20
    )
    expect(plan.questions).toHaveLength(20)
    for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS)) {
      const available = plan.questions.filter((q) => q.c === category).length
      // Without a known state there is no permit agency, so permit questions may run short.
      if (category === 'permits' && state === 'Ontario') continue
      expect(available).toBeGreaterThanOrEqual(minimum)
    }
    for (const { q } of plan.questions) expect(q).not.toMatch(/\{[a-z_]+\}/)
  })
})

describe('hdd-trenchless', () => {
  const panel = CANNED_PANELS.find((p) => p.slug === 'hdd-trenchless')!

  it('keeps no leftovers from the single-client panel it was converted from', () => {
    for (const { q } of panel.questions) {
      expect(q).not.toMatch(/\bNJ\b|New Jersey|NJDOT|PennDOT|Monmouth|Philadelphia|PSE&G|American Water|Ditch Witch|JT20|\b20\d\d\b/i)
    }
  })

  it('fills New Jersey questions with the state agency', () => {
    const plan = buildCannedPlan({ ...panel, version: 1 }, request('NJ'), 'eastcoastutility.com', 500)
    expect(plan.questions.some((q) => q.q.startsWith('NJDOT '))).toBe(true)
    expect(plan.questions.some((q) => q.q.includes('near Fair Haven, New Jersey'))).toBe(true)
  })
})
