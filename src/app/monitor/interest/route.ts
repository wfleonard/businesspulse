import { NextResponse } from 'next/server'
import { appUrl } from '@/lib/aeo/emails'
import { recordMonitorClick } from '@/lib/aeo/monitor'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const CLICKS_PER_IP_PER_HOUR = 30

/**
 * The Pulse offer on a snapshot report (it replaced Monitor, November 2026):
 * record the click, then show the Pulse page. The redirect always happens;
 * recording is best effort and rate limited so reloads can't inflate the
 * count. The path keeps its old name so links in sent reports still work.
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

  return NextResponse.redirect(appUrl('/pulse'), 303)
}
