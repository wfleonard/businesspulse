/** @jest-environment node */
import {
  applyPanelChanges,
  describeChange,
  summarizePanelRuns,
  templatePattern,
  validatePanelContent,
  type PanelContent,
  type PanelRunRow,
} from '../panel-content'
import { CANNED_PANELS } from '../panels'

const pest = CANNED_PANELS.find((p) => p.slug === 'pest-control')!

describe('templatePattern', () => {
  it('matches the filled question and nothing else', () => {
    const pattern = templatePattern('{service} near {city}, {state}')
    expect(pattern.test('termite treatment near Fair Haven, New Jersey')).toBe(true)
    expect(pattern.test('Termite Treatment near  Fair Haven, New Jersey')).toBe(true)
    expect(pattern.test('termite treatment in Fair Haven')).toBe(false)
  })

  it('treats regex characters in the template literally', () => {
    expect(templatePattern('is it worth it? (really)').test('is it worth it? (really)')).toBe(true)
    expect(templatePattern('is it worth it? (really)').test('is it worth i (really)')).toBe(false)
  })
})

describe('validatePanelContent', () => {
  it('accepts every canned panel', () => {
    for (const panel of CANNED_PANELS) expect(validatePanelContent(panel)).toEqual([])
  })

  it('reports duplicates, unknown slots, long questions, and bad domains', () => {
    const problems = validatePanelContent({
      ...pest,
      questions: [...pest.questions, pest.questions[0], { c: 'cost', q: 'price in {county}' }, { c: 'cost', q: 'x'.repeat(151) }],
      directoryDomains: ['https://www.yelp.com/biz'],
    })
    expect(problems.some((p) => p.startsWith('Asked twice'))).toBe(true)
    expect(problems.some((p) => p.includes('{county}'))).toBe(true)
    expect(problems.some((p) => p.startsWith('Too long'))).toBe(true)
    expect(problems.some((p) => p.includes('bare domain'))).toBe(true)
  })

  it('rejects a panel too small for a snapshot', () => {
    const problems = validatePanelContent({ ...pest, questions: pest.questions.slice(0, 10) })
    expect(problems.some((p) => p.includes('only fills'))).toBe(true)
  })
})

describe('summarizePanelRuns', () => {
  const panel: PanelContent & { dismissedDomains: string[] } = {
    name: 'Test',
    questions: [
      { c: 'service-geo', q: '{service} near {city}' },
      { c: 'technical', q: 'how does termite bait work' },
    ],
    directoryDomains: ['angieslist.com'],
    referenceDomains: ['epa.gov', 'npic.org'],
    dismissedDomains: ['bigrival.com'],
  }

  const row = (runId: string, domain: string, query: string, hosts: string[], extra: Partial<PanelRunRow> = {}): PanelRunRow => ({
    runId,
    domain,
    otherDomains: [],
    query,
    ownCited: false,
    rivals: hosts.map((host) => ({ host, title: host, cited: true })),
    error: null,
    ...extra,
  })

  const rows: PanelRunRow[] = [
    row('r1', 'a.com', 'pest control near Red Bank', ['terminix.com', 'localbug.com', 'bigrival.com', 'yelp.com']),
    row('r2', 'b.com', 'exterminator near Toms River', ['www.terminix.com', 'b.com', 'bigrival.com']),
    row('r3', 'c.com', 'bugs near Brick', ['terminix.com', 'npic.org']),
    row('r1', 'a.com', 'how does termite bait work', ['npic.org', 'extension.psu.edu']),
    row('r2', 'b.com', 'how does termite bait work', []),
    row('r3', 'c.com', 'how does termite bait work', ['epa.gov']),
  ]

  const summary = summarizePanelRuns(panel, rows)

  it('suggests hosts cited for two or more businesses that the panel does not list', () => {
    expect(summary.runs).toBe(3)
    expect(summary.domains.map((d) => d.host)).toEqual(['terminix.com'])
    expect(summary.domains[0]).toMatchObject({ businesses: 3, citations: 3 })
  })

  it('maps filled questions back to templates and flags weak ones', () => {
    const [geo, technical] = summary.questions
    expect(geo).toMatchObject({ asked: 3, answered: 3, noBusinessCited: 0, weak: false })
    expect(technical).toMatchObject({ asked: 3, answered: 3, noBusinessCited: 3, weak: true })
  })

  it('does not call a question weak on too few runs', () => {
    const few = summarizePanelRuns(panel, rows.filter((r) => r.runId !== 'r3'))
    expect(few.questions[1]).toMatchObject({ asked: 2, weak: false })
  })
})

describe('applyPanelChanges and describeChange', () => {
  it('adds normalized domains, removes questions, and describes the change', () => {
    const after = applyPanelChanges(pest, {
      addDirectory: ['https://www.Porch.com/pros', 'yelp.com'],
      addReference: ['porch.com', 'pestworld.org'],
      removeQuestions: [pest.questions[0].q],
    })
    expect(after.directoryDomains).toContain('porch.com')
    expect(after.directoryDomains.filter((d) => d === 'yelp.com')).toHaveLength(1)
    expect(after.referenceDomains).not.toContain('porch.com')
    expect(after.questions).toHaveLength(pest.questions.length - 1)
    expect(describeChange(pest, after)).toMatch(/-1 questions/)
    expect(describeChange(null, after)).toBe(`${after.questions.length} questions`)
  })
})
