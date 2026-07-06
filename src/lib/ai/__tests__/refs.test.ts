import { resolveRefs, sanitizeAnswer } from '@/lib/ai/refs'
import type { Answer } from '@/lib/ai/schema'

const known = new Map([
  ['monthly_revenue', 'Monthly Revenue'],
  ['new_estimates', 'New Estimates'],
])

describe('resolveRefs', () => {
  it('maps known keys to labels', () => {
    expect(resolveRefs(['monthly_revenue'], known)).toEqual([
      { key: 'monthly_revenue', label: 'Monthly Revenue' },
    ])
  })
  it('drops unknown keys and dedupes', () => {
    expect(
      resolveRefs(['monthly_revenue', 'made_up', 'monthly_revenue'], known)
    ).toEqual([{ key: 'monthly_revenue', label: 'Monthly Revenue' }])
  })
})

describe('sanitizeAnswer', () => {
  it('removes invented source refs', () => {
    const answer: Answer = {
      answer: 'x',
      drivers: [],
      suggestedActions: [],
      sourceMetricRefs: ['monthly_revenue', 'hallucinated_metric'],
      confidence: 'medium',
    }
    expect(sanitizeAnswer(answer, known).sourceMetricRefs).toEqual(['monthly_revenue'])
  })
})
