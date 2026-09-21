/** @jest-environment node */
import { CATEGORY_MINIMUMS, fillSlots, hash32, sampleQuestions, type PanelQuestion } from '../questions'

const panel = (counts: Record<string, number>): PanelQuestion[] =>
  Object.entries(counts).flatMap(([c, n]) =>
    Array.from({ length: n }, (_, i) => ({ c, q: `${c} question ${i + 1}` }))
  )

describe('fillSlots', () => {
  it('replaces every slot with its trimmed value', () => {
    expect(
      fillSlots([{ c: 'cost', q: '{service} cost in {state}?' }], {
        service: ' directional drilling ',
        state: 'New Jersey',
      })
    ).toEqual([{ c: 'cost', q: 'directional drilling cost in New Jersey?' }])
  })

  it('drops a question with a missing or blank slot value', () => {
    const questions = [
      { c: 'permits', q: 'Do I need a {state_permit_agency} permit?' },
      { c: 'cost', q: '{service} cost?' },
      { c: 'geo', q: '{service} in {city}' },
    ]
    expect(fillSlots(questions, { service: 'HDD', city: '  ' })).toEqual([
      { c: 'cost', q: 'HDD cost?' },
    ])
  })

  it('keeps only the first of two templates that fill to the same question', () => {
    // A tree-services run with the service "tree removal" asked this twice
    // and could never finish: answers are counted by question text.
    const questions = [
      { c: 'service-geo', q: '{service} near {city}, {state}' },
      { c: 'service-geo', q: 'tree removal near {city}, {state}' },
      { c: 'service-geo', q: 'Tree  Removal near {city}, {state}' },
      { c: 'cost', q: 'tree removal cost' },
    ]
    expect(fillSlots(questions, { service: 'tree removal', city: 'Oceanport', state: 'New Jersey' })).toEqual([
      { c: 'service-geo', q: 'tree removal near Oceanport, New Jersey' },
      { c: 'cost', q: 'tree removal cost' },
    ])
  })

  it('keeps questions that have no slots', () => {
    expect(fillSlots([{ c: 'x', q: 'plain question' }], {})).toEqual([{ c: 'x', q: 'plain question' }])
  })
})

describe('hash32', () => {
  it('is stable for known input', () => {
    // Pinned: changing the hash would reshuffle every business's questions.
    expect(hash32('')).toBe(0x811c9dc5)
    expect(hash32('a')).toBe(0xe40c292c)
  })
})

describe('sampleQuestions', () => {
  const big = panel({ 'service-geo': 10, cost: 6, permits: 6, technical: 12, comparison: 8 })

  it('returns every question, in panel order, when count covers the panel', () => {
    const small = panel({ cost: 2, permits: 1 })
    expect(sampleQuestions(small, 20, 'a.com')).toEqual(small)
  })

  it('returns exactly count questions with no duplicates', () => {
    const sample = sampleQuestions(big, 20, 'eastcoastutility.com')
    expect(sample).toHaveLength(20)
    expect(new Set(sample.map((q) => q.q)).size).toBe(20)
  })

  it('is deterministic for the same seed', () => {
    expect(sampleQuestions(big, 15, 'eastcoastutility.com')).toEqual(
      sampleQuestions(big, 15, 'eastcoastutility.com')
    )
  })

  it('differs between seeds', () => {
    const a = sampleQuestions(big, 15, 'eastcoastutility.com').map((q) => q.q)
    const b = sampleQuestions(big, 15, 'example-contractor.com').map((q) => q.q)
    expect(a).not.toEqual(b)
  })

  it('meets category minimums when the panel has them', () => {
    const sample = sampleQuestions(big, 10, 'eastcoastutility.com')
    for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS)) {
      expect(sample.filter((q) => q.c === category).length).toBeGreaterThanOrEqual(minimum)
    }
  })

  it('still reaches count when a minimum category is short', () => {
    const lopsided = panel({ 'service-geo': 1, cost: 0, technical: 30 })
    const sample = sampleQuestions(lopsided, 12, 'a.com')
    expect(sample).toHaveLength(12)
    expect(sample.filter((q) => q.c === 'service-geo')).toHaveLength(1)
  })

  it('selects the same questions regardless of input order', () => {
    const reversed = [...big].reverse()
    const set = (qs: PanelQuestion[]) => qs.map((q) => q.q).sort()
    expect(set(sampleQuestions(reversed, 15, 'a.com'))).toEqual(set(sampleQuestions(big, 15, 'a.com')))
  })

  it('returns the sample in panel order', () => {
    const sample = sampleQuestions(big, 15, 'a.com')
    const positions = sample.map((q) => big.findIndex((b) => b.q === q.q))
    expect(positions).toEqual([...positions].sort((x, y) => x - y))
  })
})
