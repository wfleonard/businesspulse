/** @jest-environment node */
import { verifyTurnstile } from '../turnstile'

function fakeFetch(response: { status?: number; body?: unknown } | Error) {
  const calls: { url: string; body: URLSearchParams }[] = []
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: init?.body as URLSearchParams })
    if (response instanceof Error) throw response
    return new Response(JSON.stringify(response.body ?? {}), { status: response.status ?? 200 })
  }) as typeof fetch
  return { impl, calls }
}

describe('verifyTurnstile', () => {
  it('skips the check in development when no secret is set', async () => {
    await expect(verifyTurnstile('', null, { secret: '', production: false })).resolves.toEqual({
      ok: true,
      skipped: true,
    })
  })

  it('fails in production when no secret is set', async () => {
    const result = await verifyTurnstile('token', null, { secret: '', production: true })
    expect(result.ok).toBe(false)
  })

  it('fails without a token, without calling Cloudflare', async () => {
    const fetch = fakeFetch({ body: { success: true } })
    const result = await verifyTurnstile('', '1.2.3.4', { secret: 's', fetchImpl: fetch.impl })
    expect(result).toEqual({ ok: false, reason: 'missing token' })
    expect(fetch.calls).toHaveLength(0)
  })

  it('passes when Cloudflare says success, sending secret, token and IP', async () => {
    const fetch = fakeFetch({ body: { success: true } })
    const result = await verifyTurnstile('tok', '1.2.3.4', { secret: 's', fetchImpl: fetch.impl })
    expect(result).toEqual({ ok: true })
    expect(fetch.calls[0].url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(Object.fromEntries(fetch.calls[0].body)).toEqual({ secret: 's', response: 'tok', remoteip: '1.2.3.4' })
  })

  it('omits an unknown IP', async () => {
    const fetch = fakeFetch({ body: { success: true } })
    await verifyTurnstile('tok', 'unknown', { secret: 's', fetchImpl: fetch.impl })
    expect(fetch.calls[0].body.has('remoteip')).toBe(false)
  })

  it('reports Cloudflare error codes on rejection', async () => {
    const fetch = fakeFetch({ body: { success: false, 'error-codes': ['timeout-or-duplicate'] } })
    await expect(verifyTurnstile('tok', null, { secret: 's', fetchImpl: fetch.impl })).resolves.toEqual({
      ok: false,
      reason: 'timeout-or-duplicate',
    })
  })

  it('fails closed on an HTTP error or network failure', async () => {
    const http = fakeFetch({ status: 500 })
    expect((await verifyTurnstile('tok', null, { secret: 's', fetchImpl: http.impl })).ok).toBe(false)
    const down = fakeFetch(new Error('ECONNRESET'))
    await expect(verifyTurnstile('tok', null, { secret: 's', fetchImpl: down.impl })).resolves.toEqual({
      ok: false,
      reason: 'ECONNRESET',
    })
  })
})
