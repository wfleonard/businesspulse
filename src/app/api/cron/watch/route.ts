import crypto from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { runWatchAll } from '@/lib/watch/run'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Run Business Watch (alerts + insights + digest) for all orgs. CRON_SECRET-guarded. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const results = await runWatchAll()
  return NextResponse.json({
    ok: true,
    orgs: results.length,
    results,
  })
}
