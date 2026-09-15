/** @jest-environment node */
import { decideOutcome } from '../outcome'

describe('decideOutcome', () => {
  it('completes when every question is answered, on any attempt', () => {
    expect(decideOutcome({ total: 20, answered: 20, attempt: 1, maxAttempts: 3 })).toBe('complete')
    expect(decideOutcome({ total: 20, answered: 20, attempt: 3, maxAttempts: 3 })).toBe('complete')
  })

  it('retries while attempts remain, however few are missing', () => {
    expect(decideOutcome({ total: 20, answered: 19, attempt: 1, maxAttempts: 3 })).toBe('retry')
    expect(decideOutcome({ total: 20, answered: 0, attempt: 2, maxAttempts: 3 })).toBe('retry')
  })

  it('completes a partial report on the final attempt when at least half are answered', () => {
    expect(decideOutcome({ total: 20, answered: 10, attempt: 3, maxAttempts: 3 })).toBe('complete')
    expect(decideOutcome({ total: 20, answered: 17, attempt: 3, maxAttempts: 3 })).toBe('complete')
  })

  it('fails on the final attempt when fewer than half are answered', () => {
    expect(decideOutcome({ total: 20, answered: 9, attempt: 3, maxAttempts: 3 })).toBe('fail')
    expect(decideOutcome({ total: 20, answered: 0, attempt: 3, maxAttempts: 3 })).toBe('fail')
  })

  it('never completes an empty plan', () => {
    expect(decideOutcome({ total: 0, answered: 0, attempt: 3, maxAttempts: 3 })).toBe('fail')
  })
})
