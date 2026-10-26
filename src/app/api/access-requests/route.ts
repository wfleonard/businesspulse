import { NextResponse } from 'next/server'
import { createAccessRequest, notifyAccessRequest } from '@/lib/access/requests'
import { accessRequestSchema } from '@/lib/access/schema'
import { fieldErrors } from '@/lib/aeo/request-schema'
import { hashToken } from '@/lib/aeo/tokens'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const DAY_SECONDS = 24 * 60 * 60
const SUBMISSIONS_PER_IP = 3
const SUBMISSIONS_PER_EMAIL = 2

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status })
}

/**
 * Access request from /request-access: validate, rate limit, store, and email
 * the admin. It grants nothing on its own, and the reply is the same whether
 * or not the email already has a login or a waiting request.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'Invalid request.' })
  }

  const parsed = accessRequestSchema.safeParse(body)
  if (!parsed.success) {
    return reply(400, { error: 'Please fix the highlighted fields.', fields: fieldErrors(parsed.error) })
  }
  const input = parsed.data
  const ip = clientIp(req.headers)

  const limits = await Promise.all([
    rateLimit(`access:submit:ip:${ip}`, SUBMISSIONS_PER_IP, DAY_SECONDS, { failClosed: true }),
    rateLimit(`access:submit:email:${hashToken(input.email)}`, SUBMISSIONS_PER_EMAIL, DAY_SECONDS, { failClosed: true }),
  ])
  if (limits.some((limit) => limit.unavailable)) {
    return reply(503, { error: 'We are temporarily unable to take requests. Please try again in a few minutes.' })
  }
  if (limits.some((limit) => !limit.success)) {
    return reply(429, { error: 'Too many requests today. Please try again tomorrow.' })
  }

  let id: string | null
  try {
    id = await createAccessRequest(input, ip === 'unknown' ? null : ip)
  } catch (err) {
    console.error('access request not saved:', err)
    return reply(500, { error: 'Something went wrong on our side. Please try again.' })
  }

  if (id) {
    try {
      const sent = await notifyAccessRequest(id, input)
      if (!sent.sent) console.warn('access request: admin not emailed:', sent.skipped ?? sent.error)
    } catch (err) {
      console.error('access request: admin email failed:', err)
    }
  }

  return reply(200, { ok: true })
}
