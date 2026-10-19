import { NextResponse } from 'next/server'
import { fieldErrors, scanRequestSchema } from '@/lib/aeo/request-schema'
import { createScanRequest, notifyScanRequest } from '@/lib/aeo/scan-requests'
import { hashToken } from '@/lib/aeo/tokens'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const DAY_SECONDS = 24 * 60 * 60
const SUBMISSIONS_PER_IP = 5
const SUBMISSIONS_PER_EMAIL = 3

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status })
}

/**
 * Scan request from the /scan landing page: validate, rate limit, store, and
 * email the admin. Nothing paid runs from here, so there is no bot check;
 * the rate limits keep the inbox and the table from being flooded.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'Invalid request.' })
  }

  const parsed = scanRequestSchema.safeParse(body)
  if (!parsed.success) {
    return reply(400, { error: 'Please fix the highlighted fields.', fields: fieldErrors(parsed.error) })
  }
  const input = parsed.data
  const ip = clientIp(req.headers)

  // The email is hashed so raw addresses never sit in Redis keys.
  const limits = await Promise.all([
    rateLimit(`scan:submit:ip:${ip}`, SUBMISSIONS_PER_IP, DAY_SECONDS, { failClosed: true }),
    rateLimit(`scan:submit:email:${hashToken(input.email)}`, SUBMISSIONS_PER_EMAIL, DAY_SECONDS, { failClosed: true }),
  ])
  if (limits.some((limit) => limit.unavailable)) {
    return reply(503, { error: 'We are temporarily unable to take requests. Please try again in a few minutes.' })
  }
  if (limits.some((limit) => !limit.success)) {
    return reply(429, { error: 'Too many requests today. Please try again tomorrow.' })
  }

  let id: string
  try {
    id = await createScanRequest(input, ip === 'unknown' ? null : ip)
  } catch (err) {
    console.error('scan request not saved:', err)
    return reply(500, { error: 'Something went wrong on our side. Please try again.' })
  }

  try {
    const sent = await notifyScanRequest(id, input)
    if (!sent.sent) console.warn('scan request: admin not emailed:', sent.skipped ?? sent.error)
  } catch (err) {
    console.error('scan request: admin email failed:', err)
  }

  return reply(200, { ok: true })
}
