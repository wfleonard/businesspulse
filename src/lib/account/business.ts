import 'server-only'
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { queueBrief } from '@/lib/aeo/brief-jobs'
import { aeoPanel, aeoRecheck, aeoRequest, aeoRun, business } from '@/lib/db/schema'
import { CUSTOM_INDUSTRY, type BusinessProfileInput } from './schema'

/**
 * A client's business and what it owns (docs/pulse-plan.md §4.1).
 *
 * Silo rule: every function here starts from the signed-in user's id, which
 * callers take from the session, never from a form, URL, or request body.
 * Nothing a customer sees is loaded by a business, run, or request id they
 * could supply, so guessing an id gets them nothing.
 */

export type Business = typeof business.$inferSelect

export async function getBusiness(userId: string): Promise<Business | null> {
  const [row] = await db.select().from(business).where(eq(business.userId, userId)).limit(1)
  return row ?? null
}

/** The industry slug if it's an active panel, null for "Something else", undefined if it's not offered. */
async function resolvePanelSlug(industry: string): Promise<string | null | undefined> {
  if (industry === CUSTOM_INDUSTRY) return null
  const [panel] = await db
    .select({ slug: aeoPanel.slug })
    .from(aeoPanel)
    .where(and(eq(aeoPanel.slug, industry), eq(aeoPanel.isActive, true)))
    .limit(1)
  return panel ? panel.slug : undefined
}

export type SaveResult = { ok: true; business: Business } | { ok: false; field: string; error: string }

/** Create or update the signed-in user's business, then link their snapshots to it. */
export async function saveBusiness(userId: string, email: string, input: BusinessProfileInput): Promise<SaveResult> {
  const panelSlug = await resolvePanelSlug(input.industry)
  if (panelSlug === undefined) return { ok: false, field: 'industry', error: 'Choose an industry from the list' }

  const values = {
    name: input.name,
    domain: input.website,
    otherDomains: input.otherDomains,
    panelSlug,
    customIndustry: input.customIndustry,
    service: input.service,
    city: input.city,
    state: input.state,
  }
  const before = await getBusiness(userId)
  const [row] = await db
    .insert(business)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: business.userId, set: { ...values, updatedAt: new Date() } })
    .returning()

  await linkSnapshots(row.id, email)
  // A new business, or one whose site or line of work changed, gets its site read again.
  if (!before || profileChanged(before, row)) await queueBrief(row.id)
  return { ok: true, business: row }
}

/** Changes that make the brief out of date. A new name or town alone doesn't. */
export function profileChanged(
  before: Pick<Business, 'domain' | 'otherDomains' | 'service' | 'panelSlug' | 'customIndustry'>,
  after: Pick<Business, 'domain' | 'otherDomains' | 'service' | 'panelSlug' | 'customIndustry'>
): boolean {
  return (
    before.domain !== after.domain ||
    [...before.otherDomains].sort().join(',') !== [...after.otherDomains].sort().join(',') ||
    before.service.trim().toLowerCase() !== after.service.trim().toLowerCase() ||
    before.panelSlug !== after.panelSlug ||
    before.customIndustry !== after.customIndustry
  )
}

/**
 * Attach free snapshots to the business: requests from the public form that
 * were verified from the same inbox the account confirmed. Outbound prospect
 * snapshots are Saxon's sales records and never move into an account, and
 * snapshots the retention sweep already erased can't be matched.
 */
export function linkSnapshotsQuery(businessId: string, email: string) {
  return db
    .update(aeoRequest)
    .set({ businessId })
    .where(
      and(
        isNull(aeoRequest.businessId),
        eq(aeoRequest.source, 'form'),
        isNotNull(aeoRequest.verifiedAt),
        isNull(aeoRequest.anonymizedAt),
        sql`lower(${aeoRequest.email}) = ${email.trim().toLowerCase()}`
      )
    )
}

export async function linkSnapshots(businessId: string, email: string): Promise<void> {
  await linkSnapshotsQuery(businessId, email)
}

export type AccountReport = {
  publicId: string
  kind: 'snapshot' | 'recheck'
  domain: string
  status: 'queued' | 'running' | 'done' | 'failed'
  questionCount: number
  citedCount: number
  createdAt: Date
}

/** Snapshot runs behind the business's linked requests. */
export function snapshotReportsQuery(businessId: string) {
  return db
    .select({
      requestId: aeoRequest.id,
      publicId: aeoRun.publicId,
      domain: aeoRun.domain,
      status: aeoRun.status,
      questionCount: aeoRun.questionCount,
      citedCount: aeoRun.citedCount,
      createdAt: aeoRun.createdAt,
    })
    .from(aeoRequest)
    .innerJoin(aeoRun, eq(aeoRun.id, aeoRequest.runId))
    .where(eq(aeoRequest.businessId, businessId))
    .orderBy(desc(aeoRun.createdAt))
}

/** Every report the signed-in user's business owns, newest first. */
export async function listReports(userId: string): Promise<AccountReport[]> {
  const owned = await getBusiness(userId)
  if (!owned) return []

  const snapshots = await snapshotReportsQuery(owned.id)
  const requestIds = snapshots.map((s) => s.requestId)
  const rechecks = requestIds.length
    ? await db
        .select({
          publicId: aeoRun.publicId,
          domain: aeoRun.domain,
          status: aeoRun.status,
          questionCount: aeoRun.questionCount,
          citedCount: aeoRun.citedCount,
          createdAt: aeoRun.createdAt,
        })
        .from(aeoRecheck)
        .innerJoin(aeoRun, eq(aeoRun.id, aeoRecheck.runId))
        .where(inArray(aeoRecheck.requestId, requestIds))
    : []

  // Several requests can share one run (30-day reuse); list each report once.
  const seen = new Set<string>()
  const reports: AccountReport[] = []
  for (const [kind, rows] of [
    ['snapshot', snapshots],
    ['recheck', rechecks],
  ] as const) {
    for (const { publicId, domain, status, questionCount, citedCount, createdAt } of rows) {
      if (seen.has(publicId)) continue
      seen.add(publicId)
      reports.push({ publicId, kind, domain, status, questionCount, citedCount, createdAt })
    }
  }
  return reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
