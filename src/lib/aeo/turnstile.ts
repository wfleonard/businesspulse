const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileResult = { ok: true; skipped?: true } | { ok: false; reason: string }

export type TurnstileOptions = {
  secret?: string
  production?: boolean
  fetchImpl?: typeof fetch
}

/**
 * Server-side Cloudflare Turnstile check.
 *
 * Without TURNSTILE_SECRET_KEY the check is skipped in development and fails in
 * production, so a missing secret can never silently open the form to bots.
 * Local testing against the real flow can use Cloudflare's always-pass test
 * keys (site 1x00000000000000000000AA, secret 1x0000000000000000000000000000000AA).
 */
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  options: TurnstileOptions = {}
): Promise<TurnstileResult> {
  const secret = options.secret ?? process.env.TURNSTILE_SECRET_KEY
  const production = options.production ?? process.env.NODE_ENV === 'production'

  if (!secret) {
    return production ? { ok: false, reason: 'TURNSTILE_SECRET_KEY is not set' } : { ok: true, skipped: true }
  }
  if (!token) return { ok: false, reason: 'missing token' }

  const body = new URLSearchParams({ secret, response: token })
  if (ip && ip !== 'unknown') body.set('remoteip', ip)

  try {
    const res = await (options.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { ok: false, reason: `siteverify returned ${res.status}` }

    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (data.success === true) return { ok: true }
    return { ok: false, reason: data['error-codes']?.join(',') || 'rejected' }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}
