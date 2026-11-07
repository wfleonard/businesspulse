/** @jest-environment node */
import { buildFixUserContent, cleanFixes, writeFixes, type FixCall } from '../fixes'
import { buildPulseReport, buildTrend, pulseCategoryLabel, type PulseResultInput } from '../pulse-report'
import { blockedAgents, checkSite, hasMetaDescription, jsonLdTypes } from '../site-checks'

const row = (engine: string, query: string, category: string, over: Partial<PulseResultInput> = {}): PulseResultInput => ({
  engine,
  query,
  category,
  ownCited: false,
  nameMentioned: false,
  directoryOnly: false,
  rivals: [],
  sources: [],
  answer: 'An answer.',
  searches: 1,
  error: null,
  ...over,
})

const results: PulseResultInput[] = [
  row('openai', 'where to buy a guadalupe canvas', 'service-geo', { ownCited: true }),
  row('claude', 'where to buy a guadalupe canvas', 'service-geo', { rivals: [{ host: 'ebay.com', title: '', cited: true }] }),
  row('openai', 'guadalupe canvas price', 'cost', { nameMentioned: true, rivals: [{ host: 'catholiccompany.com', title: '', cited: true }] }),
  row('claude', 'guadalupe canvas price', 'cost', {
    searches: 0,
    rivals: [{ host: 'catholiccompany.com', title: '', cited: true }, { host: 'usccb.gov', title: '', cited: true }],
  }),
  row('openai', 'bulk prints for a diocese', 'buyer-role', { error: 'HTTP 500', answer: null }),
  row('claude', 'bulk prints for a diocese', 'buyer-role', { error: 'HTTP 500', answer: null }),
]
const offerings = new Map([
  ['where to buy a guadalupe canvas', 'Canvas prints'],
  ['guadalupe canvas price', 'Canvas prints'],
])

describe('buildPulseReport', () => {
  const report = buildPulseReport(results, { offerings, directoryDomains: ['ebay.com'], seller: true })

  it('counts a question as cited when any assistant cites the site, and leaves out unanswered ones', () => {
    expect(report).toMatchObject({ questionCount: 3, answeredCount: 2, citedCount: 1, namedCount: 1 })
  })

  it('keeps every assistant per question, in a fixed order', () => {
    const q = report.questions.find((x) => x.query === 'where to buy a guadalupe canvas')!
    expect(q.answers.map((a) => [a.label, a.verdict])).toEqual([
      ['ChatGPT', 'cited'],
      ['Claude', 'absent'],
    ])
    expect(q.citedBy).toBe(1)
  })

  it('counts by assistant, offering, and who is cited instead, without government sites', () => {
    expect(report.engines).toEqual([
      { engine: 'openai', label: 'ChatGPT', answered: 2, cited: 1, searched: 2 },
      { engine: 'claude', label: 'Claude', answered: 2, cited: 0, searched: 1 },
    ])
    expect(report.offerings).toEqual([{ offering: 'Canvas prints', questions: 2, cited: 1 }])
    expect(report.rivals).toEqual([
      { host: 'catholiccompany.com', questions: 1, directory: false },
      { host: 'ebay.com', questions: 1, directory: true },
    ])
  })

  it('reads question types the way a seller is found', () => {
    expect(report.categories[0].label).toBe('Finding where to buy')
    expect(pulseCategoryLabel('service-geo', false)).toBe('Hiring near you')
  })
})

describe('buildTrend', () => {
  const now = buildPulseReport(results, { offerings })
  const before = buildPulseReport(
    [row('openai', 'guadalupe canvas price', 'cost', { ownCited: true }), row('openai', 'where to buy a guadalupe canvas', 'service-geo')],
    { offerings }
  )

  it('lists gained and lost questions only when the question set is the same', () => {
    const same = buildTrend(now, before, { previousDate: new Date('2026-10-01'), samePanel: true })
    expect(same).toMatchObject({ previousCited: 1, gained: ['where to buy a guadalupe canvas'], lost: ['guadalupe canvas price'] })
    expect(buildTrend(now, before, { previousDate: new Date(), samePanel: false })).toMatchObject({ gained: [], lost: [] })
  })
})

describe('site checks', () => {
  it('finds JSON-LD types in nested and @graph blocks, and ignores broken ones', () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":["Product","Thing"],"offers":{"@type":"Offer"}}]}</script>
      <script type='application/ld+json'>{broken</script>`
    expect(jsonLdTypes(html).sort()).toEqual(['Offer', 'Organization', 'Product', 'Thing'])
    expect(hasMetaDescription('<meta name="description" content="Canvas prints">')).toBe(true)
    expect(hasMetaDescription('<meta name="description" content="">')).toBe(false)
  })

  it('names the AI crawlers robots.txt keeps out', () => {
    const robots = 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: PerplexityBot\nDisallow: /\n\nUser-agent: *\nDisallow: /admin'
    expect(blockedAgents(robots, ['GPTBot', 'PerplexityBot', 'ClaudeBot'])).toEqual(['GPTBot', 'PerplexityBot'])
    expect(blockedAgents(null, ['GPTBot'])).toEqual([])
  })

  it('checks a live site end to end', async () => {
    const pages: Record<string, string> = {
      'https://acme.com/':
        '<title>Acme</title><meta name="description" content="Roofing"><script type="application/ld+json">{"@type":"RoofingContractor"}</script><p>' +
        'Roof repair in Red Bank and Middletown. '.repeat(20) +
        '</p>',
      'https://acme.com/robots.txt': 'User-agent: Claude-SearchBot\nDisallow: /\nSitemap: https://acme.com/sitemap.xml',
      'https://acme.com/sitemap.xml': '<urlset><url><loc>https://acme.com/faq</loc></url></urlset>',
      'https://acme.com/faq': '<script type="application/ld+json">{"@type":"FAQPage"}</script><div id="app"></div>',
    }
    const fetch = async (url: string) => {
      if (!(url in pages)) throw new Error('HTTP 404')
      return { url, html: pages[url] }
    }
    const checks = await checkSite(
      { domain: 'acme.com', pageUrls: ['https://acme.com/faq'], places: ['Red Bank, NJ', 'Holmdel, NJ'], scope: 'local', sellsProducts: false },
      { fetch }
    )
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]))
    expect(byId['ai-crawlers']).toMatchObject({ status: 'fix', items: ['Claude-SearchBot'] })
    expect(byId['sitemap'].status).toBe('pass')
    expect(byId['business-schema'].status).toBe('pass')
    expect(byId['faq-schema']).toMatchObject({ status: 'pass', items: ['/faq'] })
    expect(byId['offer-schema'].status).toBe('fix')
    expect(byId['readable-text']).toMatchObject({ status: 'fix', items: ['/faq'] })
    expect(byId['places-named']).toMatchObject({ status: 'fix', items: ['Holmdel, NJ'] })
    expect(byId['llms-txt'].status).toBe('info')
  })
})

describe('fixes', () => {
  const report = buildPulseReport(results, { offerings, directoryDomains: ['ebay.com'], seller: true })
  const checks = [{ id: 'faq-schema', label: 'FAQ', status: 'fix' as const, detail: 'none', items: [] }]
  const output = {
    fixes: [
      {
        priority: 'low' as const,
        title: 'Add llms.txt',
        why: 'Optional summary.',
        steps: ['Write it'],
        effort: 'small' as const,
        evidence_questions: [],
        evidence_checks: ['llms-txt'],
        evidence_sites: [],
      },
      {
        priority: 'high' as const,
        title: 'Publish a price page — with sizes',
        why: 'Price questions go to catholiccompany.com.',
        steps: ['List every size and price', ''],
        effort: 'medium' as const,
        evidence_questions: ['GUADALUPE CANVAS PRICE', 'a question we never asked'],
        evidence_checks: ['faq-schema', 'made-up'],
        evidence_sites: ['catholiccompany.com', 'nowhere.com'],
      },
    ],
  }

  it('keeps only real evidence, puts high priority first, and drops em dashes', () => {
    const fixes = cleanFixes(output, { report, checks })
    expect(fixes.map((f) => f.priority)).toEqual(['high', 'low'])
    expect(fixes[0].title).toBe('Publish a price page, with sizes')
    expect(fixes[0].steps).toEqual(['List every size and price'])
    expect(fixes[0].evidence).toEqual({ questions: ['guadalupe canvas price'], checks: ['faq-schema'], sites: ['catholiccompany.com'] })
    expect(fixes[1].evidence.checks).toEqual([])
  })

  it('gives the model the counts, the checks, and the missed questions with who won them', () => {
    const text = buildFixUserContent({
      businessName: 'Primos',
      domain: 'primos.com',
      summary: 's',
      offerings: ['Canvas prints'],
      scope: 'national',
      report,
      checks,
      pages: [{ url: 'https://primos.com/parishes', title: 'For parishes' }],
    })
    expect(text).toContain('- /parishes :: For parishes')
    expect(text).toContain('Cited on 1 of 2 questions')
    expect(text).toContain('Claude cited 0 of 2, searched the web on 1 (answered the rest from memory)')
    expect(text).toContain('[faq-schema] FIX')
    expect(text).toContain('guadalupe canvas price :: named, not linked; cited instead: catholiccompany.com')
    expect(text).not.toContain('bulk prints for a diocese')
  })

  it('reports spend when the output is unusable', async () => {
    const call: FixCall = async () => ({ text: '{"fixes":[]}', stopReason: 'end_turn', inputTokens: 10_000, outputTokens: 1_000, model: 'claude-opus-5-5' })
    await expect(
      writeFixes({ businessName: 'P', domain: 'p.com', summary: '', offerings: [], scope: 'national', report, checks }, { call })
    ).rejects.toMatchObject({ costUsd: expect.any(Number) })
  })
})
