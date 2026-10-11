/** @jest-environment node */
import { cleanDraft, draftPanel, PanelDraftError, type DraftCall, type DraftOutput } from '../panel-draft'
import { validatePanelContent } from '../panel-content'
import { CANNED_PANELS } from '../panels'

const pest = CANNED_PANELS.find((p) => p.slug === 'pest-control')!

const output = (extra: Partial<DraftOutput> = {}): DraftOutput => ({
  name: 'Pest control',
  questions: pest.questions.map((q) => ({ category: q.c as DraftOutput['questions'][number]['category'], question: q.q })),
  directory_domains: ['https://www.Porch.com', 'yelp.com', 'porch.com'],
  reference_domains: ['npic.org', 'wikipedia.org', 'not a domain'],
  ...extra,
})

const fakeCall = (text: string | null, stopReason = 'end_turn'): DraftCall => async () => ({
  text,
  stopReason,
  inputTokens: 1000,
  outputTokens: 5000,
})

const input = { name: 'Pest control', buyers: 'Homeowners', rationale: '', guidance: '' }

describe('cleanDraft', () => {
  it('drops unusable questions and common or invalid domains', () => {
    const cleaned = cleanDraft(
      output({
        questions: [
          { category: 'cost', question: 'how much does   pest control cost' },
          { category: 'cost', question: 'How much does pest control cost' },
          { category: 'service-geo', question: 'is {business} any good in {city}' },
          { category: 'service-geo', question: 'exterminator in {county}' },
          { category: 'technical', question: 'see www.example.com for tips' },
        ],
      })
    )
    expect(cleaned.questions).toEqual([{ c: 'cost', q: 'how much does pest control cost' }])
    expect(cleaned.directoryDomains).toEqual(['porch.com'])
    expect(cleaned.referenceDomains).toEqual(['npic.org'])
  })
})

describe('draftPanel', () => {
  it('returns a cleaned draft that validates, priced at Opus 5.5 rates', async () => {
    const draft = await draftPanel(input, { call: fakeCall(JSON.stringify(output())) })
    expect(draft.model).toBe('claude-opus-5-5')
    expect(draft.costUsd).toBeCloseTo((1000 * 4 + 5000 * 20) / 1_000_000)
    expect(validatePanelContent(draft)).toEqual([])
  })

  it.each([
    ['a refusal', fakeCall(null, 'refusal'), /declined/],
    ['a cut-off answer', fakeCall('{"name":', 'max_tokens'), /cut off/],
    ['invalid JSON', fakeCall('not json'), /invalid JSON/],
    ['too few questions', fakeCall(JSON.stringify(output({ questions: output().questions.slice(0, 5) }))), /usable questions/],
  ])('fails cleanly on %s, keeping the cost', async (_label, call, message) => {
    const attempt = draftPanel(input, { call })
    await expect(attempt).rejects.toThrow(message)
    await expect(attempt).rejects.toBeInstanceOf(PanelDraftError)
  })
})
