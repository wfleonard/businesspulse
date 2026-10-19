import { desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoScanRequest } from '@/lib/db/schema'
import { sendEmail, type SendResult } from '@/lib/email/provider'
import { adminScanRequestEmail } from './emails'
import type { ScanRequestInput } from './request-schema'

/**
 * Scan requests from the /scan landing page. They're leads, not snapshot
 * requests: the page asks only for a business name, website, and email, so
 * nothing runs on its own. The admin is emailed and starts a snapshot from
 * the dashboard.
 */

export async function createScanRequest(input: ScanRequestInput, ipAddress: string | null): Promise<string> {
  const [row] = await db
    .insert(aeoScanRequest)
    .values({ businessName: input.businessName, domain: input.website, email: input.email, ipAddress })
    .returning({ id: aeoScanRequest.id })
  return row.id
}

/** Email the admin. Best effort: the request is already saved, so a failed send doesn't fail the form. */
export async function notifyScanRequest(id: string, input: ScanRequestInput): Promise<SendResult> {
  const admin = process.env.AEO_ADMIN_EMAIL
  if (!admin) return { sent: false, skipped: 'AEO_ADMIN_EMAIL is not set' }
  const result = await sendEmail({
    to: admin,
    replyTo: { email: input.email, name: input.businessName },
    ...adminScanRequestEmail({ businessName: input.businessName, domain: input.website, email: input.email }),
  })
  if (result.sent) await db.update(aeoScanRequest).set({ notifiedAt: new Date() }).where(eq(aeoScanRequest.id, id))
  return result
}

export type ScanRequestRow = {
  id: string
  businessName: string
  domain: string
  email: string
  createdAt: Date
  notifiedAt: Date | null
}

/** Newest first, contact details still held. */
export async function listScanRequests(limit = 100): Promise<ScanRequestRow[]> {
  return db
    .select({
      id: aeoScanRequest.id,
      businessName: aeoScanRequest.businessName,
      domain: aeoScanRequest.domain,
      email: aeoScanRequest.email,
      createdAt: aeoScanRequest.createdAt,
      notifiedAt: aeoScanRequest.notifiedAt,
    })
    .from(aeoScanRequest)
    .where(isNull(aeoScanRequest.anonymizedAt))
    .orderBy(desc(aeoScanRequest.createdAt))
    .limit(limit)
}

export async function deleteScanRequest(id: string): Promise<boolean> {
  const deleted = await db.delete(aeoScanRequest).where(eq(aeoScanRequest.id, id)).returning({ id: aeoScanRequest.id })
  return deleted.length > 0
}

/** Erase contact details past the retention period, like snapshot requests. Returns how many were cleared. */
export async function sweepExpiredScanRequests(retentionDays: number): Promise<number> {
  const result = await db.execute(sql`
    update aeo_scan_request
    set email = '', business_name = '', ip_address = null, anonymized_at = now()
    where anonymized_at is null
      and created_at < now() - ${retentionDays}::int * interval '1 day'
    returning id
  `)
  return result.rows.length
}
