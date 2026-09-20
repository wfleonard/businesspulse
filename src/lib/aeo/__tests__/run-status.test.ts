/** @jest-environment node */
import { describeRunState, parseUnanswered, type RunStateInput } from '../run-status'

const options = { maxAttempts: 3, retryDelaySeconds: 60, now: new Date('2026-09-20T12:00:00Z') }
const minutesAgo = (n: number) => new Date(options.now.getTime() - n * 60_000)

const run = (over: Partial<RunStateInput>): RunStateInput => ({
  status: 'queued',
  attempts: 1,
  error: null,
  lockedAt: null,
  ...over,
})

describe('parseUnanswered', () => {
  it('reads the worker message', () => {
    expect(parseUnanswered('1 of 20 questions unanswered: HTTP 429: Request rate limit exceeded.')).toEqual({
      missing: 1,
      total: 20,
      cause: 'HTTP 429: Request rate limit exceeded.',
    })
  })

  it('returns null for anything else', () => {
    expect(parseUnanswered('panel exited with 1: boom')).toBeNull()
    expect(parseUnanswered('')).toBeNull()
  })
})

describe('describeRunState', () => {
  it('says nothing for runs that are fine', () => {
    expect(describeRunState(run({ status: 'done', attempts: 1 }), options)).toBeNull()
    expect(describeRunState(run({ status: 'running' }), options)).toBeNull()
    expect(describeRunState(run({ attempts: 0 }), options)).toBeNull()
    expect(describeRunState(run({ error: null }), options)).toBeNull()
  })

  it('explains a partial attempt waiting to retry', () => {
    const note = describeRunState(
      run({ error: '1 of 20 questions unanswered: HTTP 429: Request rate limit exceeded.', lockedAt: minutesAgo(0) }),
      options
    )
    expect(note).toEqual({
      tone: 'retrying',
      headline: 'Attempt 1 of 3 answered 19 of 20 questions. The rest are retried automatically, next try in about a minute.',
      detail: 'HTTP 429: Request rate limit exceeded.',
    })
  })

  it('says shortly when the next try is due', () => {
    const note = describeRunState(
      run({ attempts: 2, error: '3 of 20 questions unanswered: HTTP 429', lockedAt: minutesAgo(10) }),
      options
    )
    expect(note?.headline).toBe(
      'Attempt 2 of 3 answered 17 of 20 questions. The rest are retried automatically, next try shortly.'
    )
  })

  it('handles an error that is not about unanswered questions', () => {
    const note = describeRunState(run({ error: 'panel exited with 1: boom', lockedAt: minutesAgo(0) }), options)
    expect(note).toEqual({
      tone: 'retrying',
      headline: "Attempt 1 of 3 didn't finish. It retries automatically, next try in about a minute.",
      detail: 'panel exited with 1: boom',
    })
  })

  it('reports a real failure with its cause', () => {
    expect(describeRunState(run({ status: 'failed', attempts: 3, error: 'every question failed: HTTP 500' }), options)).toEqual({
      tone: 'failed',
      headline: 'Failed after 3 attempts.',
      detail: 'every question failed: HTTP 500',
    })
    expect(describeRunState(run({ status: 'failed', attempts: 1, error: null }), options)?.headline).toBe(
      'Failed after 1 attempt.'
    )
  })
})
