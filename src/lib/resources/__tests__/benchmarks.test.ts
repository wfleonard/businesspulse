/** @jest-environment node */
import { classifySource, summarizeBenchmark, type BenchmarkRow } from '../benchmarks'

const lists = {
  directoryDomains: ['yelp.com', 'angi.com'],
  referenceDomains: ['nrca.net', 'gaf.com'],
}

const src = (url: string, cited = true) => ({ url, title: '', cited })

function row(runId: string, domain: string, category: string, ownCited: boolean, urls: string[], error: string | null = null): BenchmarkRow {
  return { runId, domain, category, ownCited, error, sources: urls.map((u) => src(u)) }
}

describe('classifySource', () => {
  it('sorts directories, reference sites and everyone else', () => {
    expect(classifySource('m.yelp.com', lists)).toEqual({ kind: 'directory', directory: 'yelp.com' })
    expect(classifySource('nrca.net', lists)).toEqual({ kind: 'reference' })
    expect(classifySource('dot.nj.gov', lists)).toEqual({ kind: 'reference' })
    expect(classifySource('extension.psu.edu', lists)).toEqual({ kind: 'reference' })
    expect(classifySource('someroofer.com', lists)).toEqual({ kind: 'competitor' })
  })
})

describe('summarizeBenchmark', () => {
  const rows: BenchmarkRow[] = [
    // Business A: cited on 2 of 3 answered, plus one errored question.
    row('a', 'a.com', 'service-geo', true, ['https://www.a.com/', 'https://www.yelp.com/biz/a']),
    row('a', 'a.com', 'cost', true, ['https://a.com/pricing', 'https://rival1.com/']),
    row('a', 'a.com', 'permits', false, ['https://dot.nj.gov/permits', 'https://gaf.com/x']),
    row('a', 'a.com', 'cost', false, [], 'HTTP 429'),
    // Business B: never cited.
    row('b', 'b.com', 'service-geo', false, ['https://angi.com/x', 'https://yelp.com/y', 'https://rival2.com/']),
    row('b', 'b.com', 'cost', false, ['https://rival2.com/cost']),
    row('b', 'b.com', 'permits', false, ['https://b.com/uncited'].map((u) => u)),
  ]
  rows[6].sources = [src('https://b.com/uncited', false)]
  const summary = summarizeBenchmark(rows, lists)

  it('counts businesses and answered questions, ignoring errors', () => {
    expect(summary.businesses).toBe(2)
    expect(summary.answers).toBe(6)
    expect(summary.questionsPerBusiness).toBe(3)
  })

  it('computes how often businesses cite their own sites', () => {
    expect(summary.ownCitedShare).toBeCloseTo(2 / 6)
    expect(summary.businessesEverCited).toBe(1)
    expect(summary.medianCitedPerBusiness).toBe(1)
  })

  it('breaks results down by question type in report order', () => {
    expect(summary.categories.map((c) => [c.category, c.answers, Math.round(c.ownCitedShare * 100)])).toEqual([
      ['service-geo', 2, 50],
      ['cost', 2, 50],
      ['permits', 2, 0],
    ])
    expect(summary.categories[0].label).toBe('Hiring near you')
  })

  it('shares of answers citing each kind of site, never counting the business itself or uncited sources', () => {
    expect(summary.citedInstead.directory).toBeCloseTo(2 / 6)
    expect(summary.citedInstead.competitor).toBeCloseTo(3 / 6)
    expect(summary.citedInstead.reference).toBeCloseTo(1 / 6)
  })

  it('names only directories, each counted once per answer', () => {
    expect(summary.topDirectories).toEqual([
      { domain: 'yelp.com', share: 2 / 6 },
      { domain: 'angi.com', share: 1 / 6 },
    ])
  })

  it('handles no data', () => {
    expect(summarizeBenchmark([], lists)).toMatchObject({
      businesses: 0,
      answers: 0,
      ownCitedShare: 0,
      medianCitedPerBusiness: 0,
      questionsPerBusiness: 0,
      categories: [],
      topDirectories: [],
    })
  })
})
