/** @jest-environment node */
jest.mock('@/lib/db', () => ({ db: {} }))

import { PanelAbortedError, PanelExitError } from '../job'
import { askPulseEngines, countAnswered, isRateLimit } from '../pulse-run'
import { answerKey } from '../queue'

const plan = { questions: [{ c: 'cost', q: 'q1' }, { c: 'cost', q: 'q2' }] }
const ENGINES = ['perplexity', 'claude'] as const

const row = (engine: string, query: string, error: string | null = null) => ({
  query,
  category: 'cost',
  engine,
  model: 'm',
  own_cited: false,
  name_mentioned: false,
  directory_only: false,
  own_rank: null,
  rivals: [],
  sources: [],
  answer: error ? '' : 'answer',
  input_tokens: 0,
  output_tokens: 0,
  searches: 0,
  cost_usd: 0.01,
  error,
})

describe('askPulseEngines', () => {
  it('asks each assistant in its own job and saves after each one', async () => {
    const calls: string[] = []
    const saved: number[] = []
    const answered = new Set<string>()
    const result = await askPulseEngines({
      plan,
      engines: ENGINES,
      answered,
      runEngine: async (engine, questions) => {
        calls.push(`${engine}:${questions.map((q) => q.q).join(',')}`)
        return { rows: questions.map((q) => row(engine, q.q)), costUsd: 1.5 }
      },
      save: async (rows) => {
        saved.push(rows.length)
      },
    })
    expect(calls).toEqual(['perplexity:q1,q2', 'claude:q1,q2'])
    expect(saved).toEqual([2, 2])
    expect(result).toEqual({ errors: [], costUsd: 3 })
    expect(countAnswered(plan, ENGINES, answered)).toBe(4)
  })

  it('on a retry, asks only the pairs still missing', async () => {
    const answered = new Set([answerKey('perplexity', 'q1'), answerKey('perplexity', 'q2'), answerKey('claude', 'q1')])
    const calls: string[] = []
    await askPulseEngines({
      plan,
      engines: ENGINES,
      answered,
      runEngine: async (engine, questions) => {
        calls.push(`${engine}:${questions.map((q) => q.q).join(',')}`)
        return { rows: questions.map((q) => row(engine, q.q)), costUsd: 0.1 }
      },
      save: async () => {},
    })
    expect(calls).toEqual(['claude:q2'])
  })

  it('keeps going when one assistant fails, and reports why', async () => {
    const answered = new Set<string>()
    const result = await askPulseEngines({
      plan,
      engines: ENGINES,
      answered,
      runEngine: async (engine) => {
        if (engine === 'perplexity') throw new Error('panel did not finish within 3600s')
        return { rows: [row(engine, 'q1'), row(engine, 'q2', 'HTTP 429')], costUsd: 0.2 }
      },
      save: async () => {},
    })
    expect(result.errors).toEqual(['perplexity: panel did not finish within 3600s', 'claude: HTTP 429'])
    expect(countAnswered(plan, ENGINES, answered)).toBe(1)
  })

  it('stops the run on a shutdown or an invalid job', async () => {
    for (const err of [new PanelAbortedError(), new PanelExitError(2, null, 'bad job')]) {
      await expect(
        askPulseEngines({
          plan,
          engines: ENGINES,
          answered: new Set(),
          runEngine: async () => {
            throw err
          },
          save: async () => {},
        })
      ).rejects.toBe(err)
    }
  })
})

describe('rate limits', () => {
  it('pauses and re-asks only the rate-limited questions, in the same attempt', async () => {
    const calls: string[] = []
    const pauses: string[] = []
    const answered = new Set<string>()
    let perplexityCalls = 0
    const result = await askPulseEngines({
      plan,
      engines: ENGINES,
      answered,
      rateLimitPasses: 2,
      pause: async (engine) => {
        pauses.push(engine)
      },
      runEngine: async (engine, questions) => {
        calls.push(`${engine}:${questions.map((q) => q.q).join(',')}`)
        if (engine === 'perplexity' && perplexityCalls++ === 0) {
          return { rows: [row(engine, 'q1'), row(engine, 'q2', 'HTTP 429: Request rate limit exceeded')], costUsd: 0.01 }
        }
        return { rows: questions.map((q) => row(engine, q.q)), costUsd: 0.01 }
      },
      save: async () => {},
    })
    expect(calls).toEqual(['perplexity:q1,q2', 'perplexity:q2', 'claude:q1,q2'])
    expect(pauses).toEqual(['perplexity'])
    expect(result.errors).toEqual([])
    expect(countAnswered(plan, ENGINES, answered)).toBe(4)
  })

  it('gives up after the extra passes and leaves the rest to the next attempt', async () => {
    const calls: string[] = []
    const result = await askPulseEngines({
      plan,
      engines: ['perplexity'],
      answered: new Set(),
      rateLimitPasses: 2,
      runEngine: async (engine, questions) => {
        calls.push(engine)
        return { rows: questions.map((q) => row(engine, q.q, 'HTTP 429')), costUsd: 0 }
      },
      save: async () => {},
    })
    expect(calls).toHaveLength(3)
    expect(result.errors).toEqual(['perplexity: HTTP 429'])
  })

  it('does not wait out other errors', async () => {
    const calls: string[] = []
    await askPulseEngines({
      plan,
      engines: ['claude'],
      answered: new Set(),
      rateLimitPasses: 2,
      runEngine: async (engine, questions) => {
        calls.push(engine)
        return { rows: questions.map((q) => row(engine, q.q, 'HTTP 500')), costUsd: 0 }
      },
      save: async () => {},
    })
    expect(calls).toHaveLength(1)
  })

  it('tells a rate limit from an exhausted quota', () => {
    expect(isRateLimit('HTTP 429: Request rate limit exceeded, please try again later.')).toBe(true)
    expect(isRateLimit('HTTP 429: You exceeded your current quota')).toBe(false)
    expect(isRateLimit('search error: too_many_requests')).toBe(true)
    expect(isRateLimit('search error: invalid_tool_input')).toBe(false)
    expect(isRateLimit('HTTP 500')).toBe(false)
  })
})
