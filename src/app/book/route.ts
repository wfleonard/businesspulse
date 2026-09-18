import { NextResponse } from 'next/server'
import { bookingUrl, recordBookingClick } from '@/lib/aeo/booking'
import { appUrl } from '@/lib/aeo/emails'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const CLICKS_PER_IP_PER_HOUR = 30

/**
 * "Book a call" from a report: record the click, then send the visitor to the
 * booking page. The redirect always happens; recording is best effort and
 * rate limited so reloads can't inflate the count.
 */
export async function GET(req: Request) {
  const target = bookingUrl()
  if (!target) return NextResponse.redirect(appUrl('/'), 303)

  const limit = await rateLimit(`aeo:book:${clientIp(req.headers)}`, CLICKS_PER_IP_PER_HOUR, 60 * 60)
  if (limit.success) {
    try {
      await recordBookingClick(new URL(req.url).searchParams.get('r'))
    } catch (err) {
      console.error('booking click not recorded:', err)
    }
  }

  return NextResponse.redirect(target, 303)
}
