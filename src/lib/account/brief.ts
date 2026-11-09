import 'server-only'
import { eq } from 'drizzle-orm'
import { adminBriefConfirmedEmail } from '@/lib/access/emails'
import { db } from '@/lib/db'
import { business, businessBrief, type ConfirmedBrief } from '@/lib/db/schema'
import { queuePanelDraft } from '@/lib/aeo/business-panel-jobs'
import { sendEmail } from '@/lib/email/provider'
import type { ConfirmBriefInput } from './schema'

/**
 * The signed-in client's brief. Same silo rule as business.ts: loaded and
 * changed only through the session user's id, never an id from the browser.
 */

export type AccountBrief = typeof businessBrief.$inferSelect & { businessName: string; businessId: string }

export async function getBrief(userId: string): Promise<AccountBrief | null> {
  const [row] = await db
    .select({ brief: businessBrief, businessName: business.name, businessId: business.id })
    .from(businessBrief)
    .innerJoin(business, eq(business.id, businessBrief.businessId))
    .where(eq(business.userId, userId))
    .limit(1)
  return row ? { ...row.brief, businessName: row.businessName, businessId: row.businessId } : null
}

export type ConfirmResult = { ok: true } | { ok: false; error: string }

/**
 * Save what the client confirmed. Offerings they untick move to "not offered",
 * and anything they add is kept in their words.
 */
export async function confirmBrief(userId: string, userEmail: string, input: ConfirmBriefInput): Promise<ConfirmResult> {
  const current = await getBrief(userId)
  if (!current || !current.brief) return { ok: false, error: 'There is no brief to confirm yet.' }
  if (current.status !== 'ready' && current.status !== 'confirmed') {
    return { ok: false, error: 'We are still reading your site. Try again in a minute.' }
  }

  const known = current.brief.offerings.map((o) => o.name)
  const kept = known.filter((name) => input.offerings.includes(name))
  const dropped = known.filter((name) => !input.offerings.includes(name))
  const confirmed: ConfirmedBrief = {
    offerings: [...new Set([...kept, ...input.addedOfferings])],
    notOffered: [...new Set([...current.brief.notOffered.map((n) => n.name), ...dropped])].filter(
      (name) => !input.addedOfferings.includes(name)
    ),
    buyers: [...new Set([...current.brief.buyers.map((b) => b.type).filter((b) => input.buyers.includes(b)), ...input.addedBuyers])],
    scope: input.scope,
    places: input.places,
    notes: input.notes,
    answers: input.answers,
  }
  if (confirmed.offerings.length === 0) return { ok: false, error: 'Keep or add at least one thing you sell.' }

  const firstConfirm = current.status !== 'confirmed'
  const changed = JSON.stringify(current.confirmed) !== JSON.stringify(confirmed)
  await db
    .update(businessBrief)
    .set({ status: 'confirmed', confirmed, confirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(businessBrief.id, current.id))
  // A first confirmation, or a change to it, means the questions need drafting again.
  if (firstConfirm || changed) await queuePanelDraft(current.businessId)

  const admin = process.env.AEO_ADMIN_EMAIL
  if (admin && firstConfirm) {
    const [owned] = await db.select().from(business).where(eq(business.id, current.businessId)).limit(1)
    try {
      await sendEmail({
        to: admin,
        ...adminBriefConfirmedEmail({ businessName: owned.name, domain: owned.domain, email: userEmail, businessId: owned.id }),
      })
    } catch {
      // The dashboard shows confirmed briefs either way.
    }
  }
  return { ok: true }
}
