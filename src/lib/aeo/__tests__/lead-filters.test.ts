/** @jest-environment node */
import { filtersToQuery, parseLeadFilters } from '../lead-filters'

describe('parseLeadFilters', () => {
  it('reads every filter', () => {
    expect(
      parseLeadFilters({ vertical: 'hdd-trenchless', status: 'contacted', verified: 'yes', min: '2', max: '10' })
    ).toEqual({ vertical: 'hdd-trenchless', leadStatus: 'contacted', verified: true, minCited: 2, maxCited: 10 })
  })

  it('treats empty values as no filter', () => {
    expect(parseLeadFilters({ vertical: '', status: '', verified: '', min: '', max: ' ' })).toEqual({})
  })

  it('ignores malformed values instead of failing', () => {
    expect(
      parseLeadFilters({
        vertical: 'DROP TABLE',
        status: 'vip',
        verified: 'maybe',
        min: '-1',
        max: '2.5',
      })
    ).toEqual({})
  })

  it('takes the first of repeated parameters', () => {
    expect(parseLeadFilters({ status: ['won', 'new'], verified: ['no'] })).toEqual({ leadStatus: 'won', verified: false })
  })

  it('keeps "generated" as an industry', () => {
    expect(parseLeadFilters({ vertical: 'generated' })).toEqual({ vertical: 'generated' })
  })
})

describe('filtersToQuery', () => {
  it('round-trips through the parser', () => {
    const filters = { vertical: 'generated', leadStatus: 'won' as const, verified: false, minCited: 0, maxCited: 5 }
    const query = filtersToQuery(filters)
    expect(query).toBe('?vertical=generated&status=won&verified=no&min=0&max=5')
    expect(parseLeadFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters)
  })

  it('is empty without filters', () => {
    expect(filtersToQuery({})).toBe('')
  })
})
