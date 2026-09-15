/** @jest-environment node */
import { buildReport, categoryLabel, cleanAnswer, verdictOf, type ReportResultInput } from '../report'

function result(overrides: Partial<ReportResultInput> & { query: string }): ReportResultInput {
  return {
    category: 'cost',
    ownCited: false,
    nameMentioned: false,
    directoryOnly: false,
    rivals: [],
    sources: [],
    answer: `Answer to ${overrides.query}`,
    searches: 1,
    error: null,
    ...overrides,
  }
}

const cited = (...hosts: string[]) => hosts.map((host) => ({ host, title: host, cited: true }))

describe('verdictOf', () => {
  it('ranks cited, directory, named, no search, absent, and error', () => {
    expect(verdictOf(result({ query: 'q', ownCited: true, nameMentioned: true }))).toBe('cited')
    expect(verdictOf(result({ query: 'q', directoryOnly: true, nameMentioned: true }))).toBe('directory')
    expect(verdictOf(result({ query: 'q', nameMentioned: true }))).toBe('named')
    expect(verdictOf(result({ query: 'q', searches: 0 }))).toBe('no_search')
    expect(verdictOf(result({ query: 'q' }))).toBe('absent')
    expect(verdictOf(result({ query: 'q', error: 'HTTP 429' }))).toBe('error')
    expect(verdictOf(result({ query: 'q', answer: null }))).toBe('error')
  })
})

describe('categoryLabel', () => {
  it('uses friendly labels and humanizes the rest', () => {
    expect(categoryLabel('service-geo')).toBe('Hiring near you')
    expect(categoryLabel('safety_standards')).toBe('Safety standards')
    expect(categoryLabel('')).toBe('Other')
  })
})

describe('cleanAnswer', () => {
  it('removes citation markers and markdown', () => {
    const raw = '## Options\n\n- **KIELY** provides HDD in **New Jersey**.[1]\n- **East Coast Utility** is local.[2][3]\n\n\n\nDone [4, 5].'
    expect(cleanAnswer(raw)).toBe('Options\n\n• KIELY provides HDD in New Jersey.\n• East Coast Utility is local.\n\nDone.')
  })

  it('cuts long answers at a word boundary with an ellipsis', () => {
    const out = cleanAnswer('word '.repeat(300), 100)
    expect(out.length).toBeLessThanOrEqual(101)
    expect(out.endsWith('word…')).toBe(true)
  })

  it('leaves short answers whole', () => {
    expect(cleanAnswer('Short answer.', 100)).toBe('Short answer.')
  })
})

describe('buildReport', () => {
  const results = [
    result({ query: 'hdd contractor near fair haven', category: 'service-geo', ownCited: true, nameMentioned: true, rivals: cited('kielybuilds.com', 'yelp.com') }),
    result({ query: 'hdd contractor monmouth county', category: 'service-geo', nameMentioned: true, rivals: cited('kielybuilds.com') }),
    result({ query: 'hdd cost per foot', category: 'cost', rivals: cited('homeguide.com', 'kielybuilds.com', 'currentcost.org', 'm.yelp.com') }),
    result({ query: 'njdot road opening permit', category: 'permits', rivals: [{ host: 'boringcontractors.com', title: '', cited: false }] }),
    result({ query: 'bore under a driveway', category: 'technical', rivals: cited('homeguide.com') }),
    result({ query: 'hdd vs open cut', category: 'comparison', error: 'HTTP 500', answer: null, rivals: cited('ignored.com') }),
  ]
  const summary = buildReport(results, ['yelp.com'])

  it('counts questions, answers, citations and name-only mentions', () => {
    expect(summary.questionCount).toBe(6)
    expect(summary.answeredCount).toBe(5)
    expect(summary.citedCount).toBe(1)
    expect(summary.namedCount).toBe(1)
  })

  it('orders categories with service-geo, cost and permits first', () => {
    expect(summary.categories.map((c) => [c.category, c.questions, c.cited])).toEqual([
      ['service-geo', 2, 1],
      ['cost', 1, 0],
      ['permits', 1, 0],
      ['comparison', 1, 0],
      ['technical', 1, 0],
    ])
  })

  it('ranks the top five cited rivals by questions and flags directories, including subdomains', () => {
    expect(summary.rivals).toEqual([
      { host: 'kielybuilds.com', questions: 3, directory: false },
      { host: 'homeguide.com', questions: 2, directory: false },
      { host: 'currentcost.org', questions: 1, directory: false },
      { host: 'ignored.com', questions: 1, directory: false },
      { host: 'm.yelp.com', questions: 1, directory: true },
    ])
  })

  it('picks misses with the most rivals first, then one win, and skips errors', () => {
    expect(summary.examples.map((e) => [e.query, e.verdict])).toEqual([
      ['hdd cost per foot', 'absent'],
      ['bore under a driveway', 'absent'],
      ['hdd contractor near fair haven', 'cited'],
    ])
    expect(summary.examples[0].citedInstead).toEqual(['homeguide.com', 'kielybuilds.com', 'currentcost.org'])
    expect(summary.examples[0].label).toBe('Cost')
  })

  it('takes the best verdict when several engines answered the same question', () => {
    const multi = buildReport([
      result({ query: 'q1', ownCited: false, rivals: cited('a.com') }),
      result({ query: 'q1', ownCited: true, rivals: cited('b.com') }),
    ])
    expect(multi.questionCount).toBe(1)
    expect(multi.citedCount).toBe(1)
    expect(multi.rivals.map((r) => r.host)).toEqual(['a.com', 'b.com'])
  })

  it('leaves government and military sites out of the cited-instead lists', () => {
    const gov = buildReport([
      result({ query: 'q', rivals: cited('bergencountynj.gov', 'usace.army.mil', 'rival.com') }),
    ])
    expect(gov.rivals.map((r) => r.host)).toEqual(['rival.com'])
    expect(gov.examples[0].citedInstead).toEqual(['rival.com'])
  })

  it('handles a run with no answers', () => {
    const empty = buildReport([result({ query: 'q', error: 'down', answer: null })])
    expect(empty).toMatchObject({ questionCount: 1, answeredCount: 0, citedCount: 0, examples: [] })
  })
})
