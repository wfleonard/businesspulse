import { NextResponse } from 'next/server'
import { appUrl, verificationEmail } from '@/lib/aeo/emails'
import { createRequest } from '@/lib/aeo/requests'
import { fieldErrors, snapshotRequestSchema } from '@/lib/aeo/request-schema'
import { hashToken } from '@/lib/aeo/tokens'
import { verifyTurnstile } from '@/lib/aeo/turnstile'
import { sendEmail } from '@/lib/email/provider'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const DAY_SECONDS = 24 * 60 * 60
const SUBMISSIONS_PER_IP = 3
const SUBMISSIONS_PER_EMAIL = 2

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status })
}

/**
 * Snapshot request: validate, bot check, rate limit, store, email a link.
 *
 * The success response is the same whether or not this email or domain has
 * been seen before, so the form can't be used to find out who has submitted.
 * Rate limits fail closed: this path leads to paid API calls.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'Invalid request.' })
  }

  const parsed = snapshotRequestSchema.safeParse(body)
  if (!parsed.success) {
    return reply(400, { error: 'Please fix the highlighted fields.', fields: fieldErrors(parsed.error) })
  }
  const input = parsed.data
  const ip = clientIp(req.headers)

  const human = await verifyTurnstile(input.turnstileToken, ip)
  if (!human.ok) {
    console.warn('aeo request: turnstile check failed:', human.reason)
    return reply(400, { error: 'We could not confirm you are human. Please try again.' })
  }

  // The email is hashed so raw addresses never sit in Redis keys.
  const limits = await Promise.all([
    rateLimit(`aeo:submit:ip:${ip}`, SUBMISSIONS_PER_IP, DAY_SECONDS, { failClosed: true }),
    rateLimit(`aeo:submit:email:${hashToken(input.email)}`, SUBMISSIONS_PER_EMAIL, DAY_SECONDS, {
      failClosed: true,
    }),
  ])
  if (limits.some((limit) => limit.unavailable)) {
    return reply(503, { error: 'We are temporarily unable to take requests. Please try again in a few minutes.' })
  }
  if (limits.some((limit) => !limit.success)) {
    return reply(429, { error: 'Too many requests today. Please try again tomorrow.' })
  }

  const { token } = await createRequest(input, ip === 'unknown' ? null : ip)
  const verifyUrl = appUrl(`/check/verify?token=${token}`)
  const sent = await sendEmail({
    to: input.email,
    ...verificationEmail({ businessName: input.businessName, domain: input.website, verifyUrl }),
  })

  if (!sent.sent) {
    if (sent.skipped && process.env.NODE_ENV !== 'production') {
      console.info(`aeo request: email not configured, verify link for ${input.website}: ${verifyUrl}`)
    } else {
      console.error('aeo request: verification email failed:', sent.error ?? sent.skipped)
      return reply(503, { error: 'We could not send the confirmation email. Please try again shortly.' })
    }
  }

  return reply(200, { ok: true })
}
