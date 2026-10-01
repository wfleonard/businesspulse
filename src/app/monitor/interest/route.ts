import { NextResponse } from 'next/server'
import { appUrl } from '@/lib/aeo/emails'
import { recordMonitorClick } from '@/lib/aeo/monitor'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const CLICKS_PER_IP_PER_HOUR = 30

/**
 * "Track this monthly" from a report: record the click, then show the Monitor
 * page. The redirect always happens; recording is best effort and rate
 * limited so reloads can't inflate the count.
 */
export async function GET(req: Request) {
  const publicId = new URL(req.url).searchParams.get('r')

  const limit = await rateLimit(`aeo:monitor:${clientIp(req.headers)}`, CLICKS_PER_IP_PER_HOUR, 60 * 60)
  if (limit.success) {
    try {
      await recordMonitorClick(publicId)
    } catch (err) {
      console.error('monitor click not recorded:', err)
    }
  }

  const target = publicId ? `/monitor?r=${encodeURIComponent(publicId)}` : '/monitor'
  return NextResponse.redirect(appUrl(target), 303)
}
