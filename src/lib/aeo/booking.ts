import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

/**
 * "Book a call" on reports. Reports link to /book?r=<publicId>, which records
 * the click against that report and redirects to the booking page, so the
 * dashboard shows which reports led to a booking attempt.
 */

/** AEO_BOOKING_URL when it's a valid https URL, else null (reports then fall back to email). */
export function bookingUrl(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.AEO_BOOKING_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

const PUBLIC_ID = /^[A-Za-z0-9_-]{24}$/

/** Record a click against the report it came from. Unknown or malformed IDs record nothing. */
export async function recordBookingClick(publicId: string | null): Promise<boolean> {
  if (!publicId || !PUBLIC_ID.test(publicId)) return false
  const result = await db.execute(sql`
    insert into aeo_booking_click (run_id)
    select id from aeo_run where public_id = ${publicId}
    returning id
  `)
  return result.rows.length > 0
}
