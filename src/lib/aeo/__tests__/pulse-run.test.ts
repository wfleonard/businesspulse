/** @jest-environment node */
jest.mock('@/lib/db', () => ({ db: {} }))

import { PanelAbortedError, PanelExitError } from '../job'
import { askPulseEngines, countAnswered } from '../pulse-run'
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
