import { NextResponse } from 'next/server'
import { isLikelyBot, isReportId, recordReportView } from '@/lib/aeo/report-views'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** One counted view per visitor per report in this window, so reloads don't inflate the count. */
const VIEW_WINDOW_SECONDS = 30 * 60

const noContent = () => new NextResponse(null, { status: 204 })

/**
 * Report view ping from the finished report page. Always answers 204, so the
 * response says nothing about whether a report exists or was counted.
 */
export async function POST(req: Request) {
  let publicId: unknown
  try {
    publicId = ((await req.json()) as { publicId?: unknown }).publicId
  } catch {
    return noContent()
  }
  if (!isReportId(publicId) || isLikelyBot(req.headers.get('user-agent'))) return noContent()

  // A signed-in admin reviewing a report from the dashboard isn't the buyer.
  try {
    if (await getSession()) return noContent()
  } catch {
    // Treat an unreadable session as signed out.
  }

  const limit = await rateLimit(`aeo:view:${clientIp(req.headers)}:${publicId}`, 1, VIEW_WINDOW_SECONDS)
  if (!limit.success) return noContent()

  try {
    await recordReportView(publicId)
  } catch (err) {
    console.error('report view not recorded:', err)
  }
  return noContent()
}
