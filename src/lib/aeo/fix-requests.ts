import type Stripe from 'stripe'
import { and, desc, eq, inArray } from 'drizzle-orm'
import {
  adminFixPaidEmail,
  adminFixRequestedEmail,
  fixDeclinedEmail,
  fixDoneEmail,
  fixQuotedEmail,
} from '@/lib/access/emails'
import { db } from '@/lib/db'
import { aeoRun, business, fixRequest, pulseReport, user } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/provider'
import { appUrl, type EmailContent } from './emails'
import { getStripe, pulseTaxCode, stripeConfigured } from './payments'

/**
 * The $500 fix (docs/pulse-plan.md §4.6): the client asks from a report, the
 * admin confirms the scope and amount, the client pays through Stripe
 * Checkout from their account, and the admin works and closes it. Every
 * client function starts from the session user's id.
 */

export type FixRequest = typeof fixRequest.$inferSelect
export type FixStatus = FixRequest['status']

/** Statuses that block a new request: one fix at a time per business. */
export const OPEN_FIX_STATUSES: FixStatus[] = ['requested', 'quoted', 'paid', 'in_progress']

export function fixPriceCents(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.FIX_PRICE_CENTS)
  return Number.isInteger(value) && value >= 100 ? value : 50_000
}

export type FixResult = { ok: true; id: string } | { ok: false; error: string }

/* ----------------------------- Emails ----------------------------- */

async function notify(to: string | undefined | null, content: EmailContent) {
  if (!to) return
  try {
    await sendEmail({ to, ...content })
  } catch {
    // The dashboard and the account show the status either way.
  }
}

async function ownerOf(businessId: string | null) {
  if (!businessId) return null
  const [row] = await db
    .select({ name: user.name, email: user.email, businessName: business.name, domain: business.domain })
    .from(business)
    .innerJoin(user, eq(user.id, business.userId))
    .where(eq(business.id, businessId))
    .limit(1)
  return row ?? null
}

/* ----------------------------- Client ----------------------------- */

/** The latest fix request of the signed-in user's business, if any. */
export async function currentFixRequest(userId: string): Promise<(FixRequest & { reportPublicId: string | null }) | null> {
  const [row] = await db
    .select({ request: fixRequest, reportPublicId: aeoRun.publicId })
    .from(fixRequest)
    .innerJoin(business, eq(business.id, fixRequest.businessId))
    .leftJoin(aeoRun, eq(aeoRun.id, fixRequest.runId))
    .where(eq(business.userId, userId))
    .orderBy(desc(fixRequest.createdAt))
    .limit(1)
  return row ? { ...row.request, reportPublicId: row.reportPublicId } : null
}

/** Ask Saxon to fix the issues in one of the user's own Pulse reports. */
export async function requestFix(userId: string, publicId: string, note: string): Promise<FixResult> {
  const [row] = await db
    .select({ runId: aeoRun.id, businessId: business.id, fixes: pulseReport.fixes, reportStatus: pulseReport.status })
    .from(aeoRun)
    .innerJoin(business, eq(business.id, aeoRun.businessId))
    .leftJoin(pulseReport, eq(pulseReport.runId, aeoRun.id))
    .where(and(eq(business.userId, userId), eq(aeoRun.publicId, publicId), eq(aeoRun.tier, 'pulse')))
    .limit(1)
  if (!row) return { ok: false, error: 'That report wasn’t found.' }
  if (row.reportStatus !== 'ready' || !row.fixes?.length) return { ok: false, error: 'This report’s fix list isn’t ready yet.' }

  const [open] = await db
    .select({ id: fixRequest.id })
    .from(fixRequest)
    .where(and(eq(fixRequest.businessId, row.businessId), inArray(fixRequest.status, OPEN_FIX_STATUSES)))
    .limit(1)
  if (open) return { ok: false, error: 'You already have a fix request open. Its status is on your account page.' }

  const [created] = await db
    .insert(fixRequest)
    .values({ businessId: row.businessId, runId: row.runId, issues: row.fixes, clientNote: note.trim().slice(0, 2000), amountCents: fixPriceCents() })
    .returning({ id: fixRequest.id })

  const owner = await ownerOf(row.businessId)
  if (owner) {
    await notify(
      process.env.AEO_ADMIN_EMAIL,
      adminFixRequestedEmail({ businessName: owner.businessName, email: owner.email, issues: row.fixes.length, id: created.id })
    )
  }
  return { ok: true, id: created.id }
}

/** Withdraw the user's open request before paying. */
export async function withdrawFix(userId: string): Promise<FixResult> {
  const current = await currentFixRequest(userId)
  if (!current || (current.status !== 'requested' && current.status !== 'quoted')) {
    return { ok: false, error: 'There’s no request to withdraw.' }
  }
  await db.update(fixRequest).set({ status: 'withdrawn', updatedAt: new Date() }).where(eq(fixRequest.id, current.id))
  return { ok: true, id: current.id }
}

export type FixCheckoutResult = { ok: true; url: string } | { ok: false; error: string }

/** Stripe Checkout for the user's quoted fix. */
export async function createFixCheckout(userId: string, email: string): Promise<FixCheckoutResult> {
  if (!stripeConfigured()) return { ok: false, error: 'Payments aren’t set up yet. Please try again later.' }
  const current = await currentFixRequest(userId)
  if (!current || current.status !== 'quoted') return { ok: false, error: 'There’s nothing to pay right now.' }
  const owner = await ownerOf(current.businessId)

  const taxCode = pulseTaxCode()
  let session: Stripe.Checkout.Session
  try {
    session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: current.amountCents,
            tax_behavior: 'exclusive',
            product_data: {
              name: 'Fix the issues in your Pulse report',
              description: `One-time work on ${owner?.domain ?? 'your website'} by Saxon Enterprises, as agreed.`,
              ...(taxCode ? { tax_code: taxCode } : {}),
            },
          },
        },
      ],
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      customer_email: email,
      client_reference_id: current.businessId ?? undefined,
      metadata: { kind: 'fix', fixRequestId: current.id },
      payment_intent_data: { metadata: { kind: 'fix', fixRequestId: current.id } },
      custom_text: { submit: { message: `By paying you agree to the BusinessPulse terms at ${appUrl('/terms')}.` } },
      success_url: appUrl('/account?fixpaid=1'),
      cancel_url: appUrl('/account?canceled=1'),
    })
  } catch (err) {
    console.error(JSON.stringify({ at: new Date().toISOString(), event: 'stripe_fix_checkout_error', fix: current.id, error: err instanceof Error ? err.message : String(err) }))
    return { ok: false, error: 'Checkout couldn’t be started just now. You weren’t charged. Please try again in a few minutes.' }
  }
  await db.update(fixRequest).set({ checkoutSessionId: session.id, updatedAt: new Date() }).where(eq(fixRequest.id, current.id))
  if (!session.url) return { ok: false, error: 'Checkout could not be started. Please try again.' }
  return { ok: true, url: session.url }
}

/* ----------------------------- Webhook ---------------------------- */

/** A completed fix checkout: mark it paid once, and tell the admin. */
export async function fixPaid(session: Stripe.Checkout.Session): Promise<{ handled: boolean; note: string }> {
  const id = session.metadata?.fixRequestId
  if (!id) return { handled: false, note: 'no fix request id on the session' }
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)
  const [updated] = await db
    .update(fixRequest)
    .set({
      status: 'paid',
      checkoutSessionId: session.id,
      paymentIntentId: intent,
      amountTax: session.total_details?.amount_tax ?? 0,
      amountTotal: session.amount_total ?? 0,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(fixRequest.id, id), eq(fixRequest.status, 'quoted')))
    .returning()
  if (!updated) return { handled: true, note: 'fix already paid or not quoted' }

  const owner = await ownerOf(updated.businessId)
  if (owner) {
    await notify(process.env.AEO_ADMIN_EMAIL, adminFixPaidEmail({ businessName: owner.businessName, totalCents: updated.amountTotal, id }))
  }
  return { handled: true, note: `fix ${id} paid` }
}

/** A refund made in Stripe for a fix payment. */
export async function fixRefunded(paymentIntentId: string): Promise<boolean> {
  const rows = await db
    .update(fixRequest)
    .set({ status: 'refunded', updatedAt: new Date() })
    .where(and(eq(fixRequest.paymentIntentId, paymentIntentId), inArray(fixRequest.status, ['paid', 'in_progress', 'done'])))
    .returning({ id: fixRequest.id })
  return rows.length > 0
}

/* ------------------------------ Admin ----------------------------- */

export async function listFixRequests(limit = 50) {
  return db
    .select({ request: fixRequest, businessName: business.name, domain: business.domain, reportPublicId: aeoRun.publicId })
    .from(fixRequest)
    .leftJoin(business, eq(business.id, fixRequest.businessId))
    .leftJoin(aeoRun, eq(aeoRun.id, fixRequest.runId))
    .orderBy(desc(fixRequest.createdAt))
    .limit(limit)
}

export async function getFixRequest(id: string) {
  const [row] = await db
    .select({ request: fixRequest, businessName: business.name, domain: business.domain, reportPublicId: aeoRun.publicId })
    .from(fixRequest)
    .leftJoin(business, eq(business.id, fixRequest.businessId))
    .leftJoin(aeoRun, eq(aeoRun.id, fixRequest.runId))
    .where(eq(fixRequest.id, id))
    .limit(1)
  if (!row) return null
  return { ...row, owner: await ownerOf(row.request.businessId) }
}

async function move(id: string, from: FixStatus[], set: Partial<typeof fixRequest.$inferInsert>): Promise<FixRequest | null> {
  const [row] = await db
    .update(fixRequest)
    .set({ ...set, updatedAt: new Date() })
    .where(and(eq(fixRequest.id, id), inArray(fixRequest.status, from)))
    .returning()
  return row ?? null
}

/** Confirm the scope and amount; the client is emailed to pay. Can be re-sent while unpaid. */
export async function quoteFix(id: string, scope: string, amountCents: number): Promise<FixResult> {
  const row = await move(id, ['requested', 'quoted'], { status: 'quoted', scope: scope.trim(), amountCents, quotedAt: new Date() })
  if (!row) return { ok: false, error: 'Only a new or quoted request can be quoted.' }
  const owner = await ownerOf(row.businessId)
  if (owner) await notify(owner.email, fixQuotedEmail({ name: owner.name, businessName: owner.businessName, amountCents, scope: row.scope }))
  return { ok: true, id }
}

export async function declineFix(id: string, note: string): Promise<FixResult> {
  const row = await move(id, ['requested', 'quoted'], { status: 'declined', adminNote: note.trim() })
  if (!row) return { ok: false, error: 'Only an unpaid request can be declined. Refund a paid one in Stripe.' }
  const owner = await ownerOf(row.businessId)
  if (owner) await notify(owner.email, fixDeclinedEmail({ name: owner.name, businessName: owner.businessName, note: row.adminNote }))
  return { ok: true, id }
}

export async function startFix(id: string): Promise<FixResult> {
  const row = await move(id, ['paid'], { status: 'in_progress', startedAt: new Date() })
  return row ? { ok: true, id } : { ok: false, error: 'Only a paid request can be started.' }
}

export async function finishFix(id: string, note: string): Promise<FixResult> {
  const row = await move(id, ['paid', 'in_progress'], { status: 'done', adminNote: note.trim(), doneAt: new Date() })
  if (!row) return { ok: false, error: 'Only a paid or in-progress request can be marked done.' }
  const owner = await ownerOf(row.businessId)
  if (owner) await notify(owner.email, fixDoneEmail({ name: owner.name, businessName: owner.businessName, note: row.adminNote }))
  return { ok: true, id }
}
