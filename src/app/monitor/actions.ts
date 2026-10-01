'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { joinMonitorWaitlist } from '@/lib/aeo/monitor'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const JOINS_PER_IP_PER_HOUR = 10

export async function joinWaitlist(formData: FormData) {
  const publicId = String(formData.get('r') ?? '')
  const limit = await rateLimit(`aeo:monitor-join:${clientIp(await headers())}`, JOINS_PER_IP_PER_HOUR, 60 * 60)
  if (limit.success) {
    try {
      await joinMonitorWaitlist(publicId)
    } catch (err) {
      console.error('monitor waitlist not joined:', err)
    }
  }
  redirect(`/monitor?r=${encodeURIComponent(publicId)}`)
}
