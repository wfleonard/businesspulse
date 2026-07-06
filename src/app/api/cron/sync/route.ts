import crypto from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { syncAllActiveSources } from '@/lib/connectors/sync'

export const dynamic = 'force-dynamic'

/** Constant-time bearer check against CRON_SECRET. */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Trigger a connector sync for all active API sources. Guarded by CRON_SECRET.
 * Intended for a scheduler (or manual curl). The worker/BullMQ scheduler added
 * at the deploy stage will call the same syncAllActiveSources().
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const summaries = await syncAllActiveSources()
  const inserted = summaries.reduce((n, s) => n + s.inserted, 0)
  return NextResponse.json({
    ok: true,
    sources: summaries.length,
    inserted,
    results: summaries.map((s) => ({
      name: s.name,
      inserted: s.inserted,
      ok: s.ok,
      errors: s.errors.slice(0, 3),
    })),
  })
}
