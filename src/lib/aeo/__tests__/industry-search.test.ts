/** @jest-environment node */
import { INDUSTRY_GROUPS, INDUSTRY_META, industryScore, searchIndustries } from '../industry-search'
import { CANNED_PANELS } from '../panels'
import { PANEL_BACKLOG } from '../panels/backlog'

const options = CANNED_PANELS.map((p) => ({ slug: p.slug, name: p.name }))
const top = (query: string, n = 3) => (searchIndustries(options, query)[0]?.options ?? []).slice(0, n).map((o) => o.slug)

describe('industry search', () => {
  it('finds panels by the everyday words people use', () => {
    expect(top('roofer', 2).sort()).toEqual(['commercial-roofing', 'residential-roofing'])
    expect(top('plumber', 1)).toEqual(['hvac-plumbing'])
    expect(top('air conditioning', 1)).toEqual(['hvac-plumbing'])
    expect(top('dentist', 1)).toEqual(['dentists'])
    expect(top('exterminator', 1)).toEqual(['pest-control'])
    expect(top('body shop', 1)).toEqual(['collision-repair'])
    expect(top('web designer', 1)).toEqual(['web-design'])
    expect(top('Landscaping & lawn care', 1)).toEqual(['landscaping'])
  })

  it('matches partial words and ignores case and punctuation', () => {
    expect(top('PLUMB', 1)).toEqual(['hvac-plumbing'])
    expect(top('arbor', 1)).toEqual(['tree-services'])
  })

  it('finds nothing for a trade with no panel, leaving "not listed"', () => {
    expect(searchIndustries(options, 'bakery')).toEqual([])
  })

  it('browses every panel in its group when nothing is typed', () => {
    const groups = searchIndustries(options, '')
    expect(groups.flatMap((g) => g.options)).toHaveLength(options.length)
    for (const g of groups) expect(INDUSTRY_GROUPS).toContain(g.label)
  })

  it('puts a panel with no search words under More industries, still found by name', () => {
    const extra = [...options, { slug: 'bakeries', name: 'Bakeries' }]
    expect(searchIndustries(extra, '').at(-1)).toEqual({ label: 'More industries', options: [{ slug: 'bakeries', name: 'Bakeries' }] })
    expect(industryScore({ slug: 'bakeries', name: 'Bakeries' }, 'bake')).toBeGreaterThan(0)
  })

  it('has search words and a group for every live and backlog panel', () => {
    const missing = [...CANNED_PANELS, ...PANEL_BACKLOG].map((p) => p.slug).filter((slug) => !INDUSTRY_META[slug])
    expect(missing).toEqual([])
  })
})
