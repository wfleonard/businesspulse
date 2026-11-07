/** @jest-environment node */
import {
  bannedTerms,
  buildPanelUserContent,
  BusinessPanelError,
  cleanBusinessPanel,
  draftBusinessPanel,
  estimateRunCostUsd,
  MIN_BUSINESS_QUESTIONS,
  type PanelCall,
  type PanelDraftInput,
} from '../business-panel'

const library = [
  {
    slug: 'religious-art',
    name: 'Religious art & gifts',
    fit: 'primary',
    questions: [{ c: 'cost', q: 'how much does a hand carved wooden statue of Mary cost' }],
    directoryDomains: ['etsy.com'],
    referenceDomains: ['vatican.va'],
  },
]

const input: PanelDraftInput = {
  businessName: 'Primos Maternos',
  domain: 'primosmaternos.com',
  otherDomains: [],
  city: 'Tinton Falls',
  stateName: 'New Jersey',
  brief: {
    summary: 'One Guadalupe image on canvas, shipped nationwide.',
    offerings: [{ name: 'Guadalupe canvas prints', detail: '24x36 rolled', main: true, sources: [] }],
    notOffered: [],
    buyers: [],
    serviceArea: {
      scope: 'national',
      detail: 'Ships to all 50 states',
      places: [],
      sellsOnline: true,
      visitsCustomers: false,
      hasStorefront: false,
      sources: [],
    },
    differentiators: [],
  },
  confirmed: {
    offerings: ['Guadalupe canvas prints'],
    notOffered: ['Statues'],
    buyers: ['Parishes'],
    scope: 'national',
    places: ['United States'],
    notes: 'Bulk orders matter most.',
  },
  library,
}

const question = (q: string, extra: Partial<{ category: string; offering: string; from_library: boolean }> = {}) => ({
  category: (extra.category ?? 'cost') as 'cost',
  question: q,
  offering: extra.offering ?? 'Guadalupe canvas prints',
  why: 'checks price questions',
  from_library: extra.from_library ?? false,
})

const many = (n: number) => Array.from({ length: n }, (_, i) => question(`where to buy a Guadalupe canvas print number ${i + 1}`))

describe('buildPanelUserContent', () => {
  it('gives the confirmed brief as authority and the library as data', () => {
    const text = buildPanelUserContent(input)
    expect(text).toContain('<confirmed_brief>')
    expect(text).toContain('- Guadalupe canvas prints: 24x36 rolled')
    expect(text).toContain('Not offered:\n- Statues')
    expect(text).toContain('Owner notes:\nBulk orders matter most.')
    expect(text).toContain('<library panel="religious-art" name="Religious art & gifts" fit="primary">')
    expect(text).toContain('[cost] how much does a hand carved wooden statue of Mary cost')
  })
})

describe('cleanBusinessPanel', () => {
  const context = { businessName: 'Primos Maternos', domains: ['primosmaternos.com'], offerings: ['Guadalupe canvas prints'], library }

  it('drops questions that name the business, carry URLs or slots, or repeat', () => {
    const cleaned = cleanBusinessPanel(
      {
        questions: [
          ...many(MIN_BUSINESS_QUESTIONS),
          question('is Primos Maternos legit'),
          question('primosmaternos canvas reviews'),
          question('see https://example.com prices'),
          question('Guadalupe canvas near {city}'),
          question('WHERE TO BUY a Guadalupe canvas print number 1'),
        ],
        directory_domains: ['ebay.com', 'primosmaternos.com'],
        reference_domains: ['https://www.wikipedia.org/', 'ebay.com'],
      },
      context
    )
    expect(cleaned.questions).toHaveLength(MIN_BUSINESS_QUESTIONS)
    expect(cleaned.directoryDomains).toEqual(['ebay.com', 'etsy.com'])
    expect(cleaned.referenceDomains).toEqual(['wikipedia.org', 'vatican.va'])
  })

  it('maps offerings to the confirmed names and marks where each came from', () => {
    const cleaned = cleanBusinessPanel(
      {
        questions: [
          question('price of a guadalupe canvas for a parish hall', { offering: 'GUADALUPE CANVAS PRINTS', from_library: true }),
          question('catholic gift ideas for a godchild', { offering: 'Rosaries' }),
          ...many(MIN_BUSINESS_QUESTIONS),
        ],
        directory_domains: [],
        reference_domains: [],
      },
      context
    )
    expect(cleaned.questions[0]).toMatchObject({ offering: 'Guadalupe canvas prints', origin: 'library' })
    expect(cleaned.questions[1]).toMatchObject({ offering: 'general', origin: 'new' })
  })

  it('refuses a draft too small to report on', () => {
    expect(() => cleanBusinessPanel({ questions: many(5), directory_domains: [], reference_domains: [] }, context)).toThrow(
      BusinessPanelError
    )
  })

  it('bans the name, its short form, and the domain label', () => {
    expect(bannedTerms('Acme Roofing LLC', ['acmeroof.com'])).toEqual(['acme roofing llc', 'acme roofing', 'acmeroof.com', 'acmeroof'])
  })
})

describe('draftBusinessPanel', () => {
  const call =
    (text: string | null, stopReason = 'end_turn'): PanelCall =>
    async () => ({ text, stopReason, inputTokens: 50_000, outputTokens: 20_000, model: 'claude-opus-5-5' })

  it('returns the cleaned panel with its cost', async () => {
    const draft = await draftBusinessPanel(input, {
      call: call(JSON.stringify({ questions: many(40), directory_domains: [], reference_domains: [] })),
    })
    expect(draft.questions).toHaveLength(40)
    expect(draft.costUsd).toBeCloseTo(0.6, 10)
  })

  it('reports spend when the draft is unusable', async () => {
    await expect(draftBusinessPanel(input, { call: call('nope') })).rejects.toMatchObject({ costUsd: expect.any(Number) })
    await expect(draftBusinessPanel(input, { call: call(null, 'max_tokens') })).rejects.toThrow('cut off')
  })
})

it('estimates a run from the measured cost per question', () => {
  expect(estimateRunCostUsd(66)).toBe(9.9)
})
