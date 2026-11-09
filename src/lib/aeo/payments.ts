import Stripe from 'stripe'
import { and, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoRun, business, businessBrief, businessPanel, pulseOrder } from '@/lib/db/schema'
import { appUrl } from './emails'
import { startPulseRun } from './pulse'

/**
 * Paying for a Pulse run (docs/pulse-plan.md §4.2): $100 through Stripe
 * Checkout, New Jersey sales tax added by Stripe Tax, at most one paid run per
 * business every 30 days. The webhook starts the run; a payment that can't
 * start one (two tabs, two purchases) is refunded at once.
 */

export const PULSE_MIN_DAYS = 30

export function pulsePriceCents(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.PULSE_PRICE_CENTS)
  return Number.isInteger(value) && value >= 100 ? value : 10_000
}

export function stripeConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_WEBHOOK_SECRET?.trim())
}

/** Stripe product tax codes look like txcd_10000000. */
const TAX_CODE = /^txcd_\d{8}$/

/**
 * The tax code for the Pulse line item, or undefined to use the account's
 * default. A malformed value is ignored with a warning: Stripe rejects the
 * whole checkout over a bad code, and a typo in .env shouldn't stop sales.
 */
export function pulseTaxCode(env: Record<string, string | undefined> = process.env): string | undefined {
  const value = env.STRIPE_PULSE_TAX_CODE?.trim()
  if (!value) return undefined
  if (TAX_CODE.test(value)) return value
  console.warn(
    JSON.stringify({
      at: new Date().toISOString(),
      event: 'stripe_tax_code_ignored',
      value,
      reason: 'not a Stripe tax code (txcd_ and 8 digits); using the account default',
    })
  )
  return undefined
}

let client: Stripe | undefined

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  client ??= new Stripe(key, {
    maxNetworkRetries: 2,
    appInfo: { name: 'BusinessPulse' },
  })
  return client
}

/* --------------------------- Eligibility -------------------------- */

export type PulseState =
  | { kind: 'reading' } // the site is being read
  | { kind: 'confirm_brief' } // the client should confirm their brief
  | { kind: 'preparing' } // the panel is being drafted or waits for the admin
  | { kind: 'running'; publicId: string }
  | { kind: 'too_soon'; nextDate: Date }
  | { kind: 'ready' }

export type PulseFacts = {
  briefStatus: string | null
  hasApprovedPanel: boolean
  activeRun: { publicId: string } | null
  /** Start of the business's last paid run, if any. Free admin runs don't count. */
  lastPaidRunAt: Date | null
  now?: Date
}

/** What the account offers right now. Pure, so the rules are unit-tested. */
export function pulseState(facts: PulseFacts): PulseState {
  if (facts.activeRun) return { kind: 'running', publicId: facts.activeRun.publicId }
  if (facts.briefStatus === null || facts.briefStatus === 'queued' || facts.briefStatus === 'reading')
    return { kind: 'reading' }
  if (facts.briefStatus === 'ready') return { kind: 'confirm_brief' }
  if (!facts.hasApprovedPanel) return { kind: 'preparing' }
  if (facts.lastPaidRunAt) {
    const nextDate = new Date(facts.lastPaidRunAt.getTime() + PULSE_MIN_DAYS * 86_400_000)
    if ((facts.now ?? new Date()) < nextDate) return { kind: 'too_soon', nextDate }
  }
  return { kind: 'ready' }
}

export async function loadPulseFacts(businessId: string): Promise<PulseFacts> {
  const [brief] = await db
    .select({ status: businessBrief.status })
    .from(businessBrief)
    .where(eq(businessBrief.businessId, businessId))
    .limit(1)
  const [panel] = await db
    .select({ id: businessPanel.id })
    .from(businessPanel)
    .where(and(eq(businessPanel.businessId, businessId), eq(businessPanel.status, 'approved')))
    .limit(1)
  const [active] = await db
    .select({ publicId: aeoRun.publicId })
    .from(aeoRun)
    .where(and(eq(aeoRun.businessId, businessId), inArray(aeoRun.status, ['queued', 'running'])))
    .limit(1)
  const [lastPaid] = await db
    .select({ startedAt: aeoRun.createdAt })
    .from(pulseOrder)
    .innerJoin(aeoRun, eq(aeoRun.id, pulseOrder.runId))
    .where(and(eq(pulseOrder.businessId, businessId), eq(pulseOrder.status, 'paid'), isNotNull(pulseOrder.runId)))
    .orderBy(desc(aeoRun.createdAt))
    .limit(1)
  return {
    briefStatus: brief?.status ?? null,
    hasApprovedPanel: Boolean(panel),
    activeRun: active ?? null,
    lastPaidRunAt: lastPaid?.startedAt ?? null,
  }
}

/* ----------------------------- Checkout --------------------------- */

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string }

/** Start a Stripe Checkout for one Pulse run, if the business may buy one now. */
export async function createPulseCheckout(args: { userId: string; email: string }): Promise<CheckoutResult> {
  if (!stripeConfigured())
    return {
      ok: false,
      error: 'Payments aren’t set up yet. Please try again later.',
    }
  const [owned] = await db.select().from(business).where(eq(business.userId, args.userId)).limit(1)
  if (!owned) return { ok: false, error: 'Set up your business first.' }
  const state = pulseState(await loadPulseFacts(owned.id))
  if (state.kind !== 'ready') return { ok: false, error: 'A new report isn’t available right now.' }

  const [order] = await db
    .insert(pulseOrder)
    .values({ businessId: owned.id, customerEmail: args.email })
    .returning({ id: pulseOrder.id })
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
            unit_amount: pulsePriceCents(),
            tax_behavior: 'exclusive',
            product_data: {
              name: 'Pulse report: AI search visibility',
              description: `Your approved buyer questions on ChatGPT, Claude, Perplexity, and Gemini for ${owned.domain}, with what to fix.`,
              ...(taxCode ? { tax_code: taxCode } : {}),
            },
          },
        },
      ],
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      customer_email: args.email,
      client_reference_id: owned.id,
      metadata: { orderId: order.id, businessId: owned.id },
      payment_intent_data: {
        metadata: { orderId: order.id, businessId: owned.id },
      },
      custom_text: {
        submit: {
          message: `By paying you agree to the BusinessPulse terms at ${appUrl('/terms')}.`,
        },
      },
      success_url: appUrl('/account?paid=1'),
      cancel_url: appUrl('/account?canceled=1'),
    })
  } catch (err) {
    // Stripe down or misconfigured: nothing was charged, so close the order and say so.
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        event: 'stripe_checkout_error',
        order: order.id,
        error: err instanceof Error ? err.message : String(err),
      })
    )
    await db
      .update(pulseOrder)
      .set({
        status: 'expired',
        note: 'Checkout could not be created',
        updatedAt: new Date(),
      })
      .where(eq(pulseOrder.id, order.id))
    return {
      ok: false,
      error: 'Checkout couldn’t be started just now. You weren’t charged. Please try again in a few minutes.',
    }
  }
  await db
    .update(pulseOrder)
    .set({ checkoutSessionId: session.id, updatedAt: new Date() })
    .where(eq(pulseOrder.id, order.id))
  if (!session.url)
    return {
      ok: false,
      error: 'Checkout could not be started. Please try again.',
    }
  return { ok: true, url: session.url }
}

/* ----------------------------- Webhook ---------------------------- */

export type WebhookOutcome = { handled: boolean; note: string }

type StripeLike = Pick<Stripe, 'refunds'>

/**
 * Apply one verified Stripe event. Idempotent: Stripe retries, and a repeat
 * of an event already applied changes nothing.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  stripe: StripeLike = getStripe()
): Promise<WebhookOutcome> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid') return { handled: false, note: 'not paid yet' }
      if (session.metadata?.kind === 'fix') {
        // Loaded here, not at the top: fix-requests imports this module.
        const { fixPaid } = await import('./fix-requests')
        return fixPaid(session)
      }
      return fulfill(session, stripe)
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      await db
        .update(pulseOrder)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(and(eq(pulseOrder.checkoutSessionId, session.id), eq(pulseOrder.status, 'pending')))
      return { handled: true, note: 'expired' }
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const intent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      if (!intent || !charge.refunded) return { handled: false, note: 'partial or unlinked refund' }
      await db
        .update(pulseOrder)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(pulseOrder.paymentIntentId, intent), inArray(pulseOrder.status, ['paid', 'pending'])))
      const { fixRefunded } = await import('./fix-requests')
      await fixRefunded(intent)
      return { handled: true, note: 'refunded' }
    }
    default:
      return { handled: false, note: `ignored ${event.type}` }
  }
}

async function fulfill(session: Stripe.Checkout.Session, stripe: StripeLike): Promise<WebhookOutcome> {
  const orderId = session.metadata?.orderId
  if (!orderId) return { handled: false, note: 'no order id on the session' }
  const intent =
    typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)

  // Mark it paid once. A retry of the same event finds it paid and only finishes what's left.
  const [order] = await db
    .update(pulseOrder)
    .set({
      status: 'paid',
      checkoutSessionId: session.id,
      paymentIntentId: intent,
      currency: session.currency ?? 'usd',
      amountSubtotal: session.amount_subtotal ?? 0,
      amountTax: session.total_details?.amount_tax ?? 0,
      amountTotal: session.amount_total ?? 0,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      paidAt: sql`coalesce(${pulseOrder.paidAt}, now())`,
      updatedAt: new Date(),
    })
    .where(and(eq(pulseOrder.id, orderId), inArray(pulseOrder.status, ['pending', 'expired', 'paid'])))
    .returning()
  if (!order) return { handled: false, note: 'order not found or already refunded' }
  if (order.runId) return { handled: true, note: 'already fulfilled' }
  if (!order.businessId) return refund(order.id, intent, stripe, 'the business no longer exists')

  // The 30-day rule and the approved panel, checked again now that the money is in.
  const state = pulseState(await loadPulseFacts(order.businessId))
  if (state.kind !== 'ready') return refund(order.id, intent, stripe, `a report could not start (${state.kind})`)

  const started = await startPulseRun(order.businessId)
  if (!started.ok) return refund(order.id, intent, stripe, started.error)
  await db.update(pulseOrder).set({ runId: started.runId, updatedAt: new Date() }).where(eq(pulseOrder.id, order.id))
  return { handled: true, note: `run ${started.publicId} started` }
}

/** Refund a payment that can't start a run, so nobody pays for one they can't get. */
async function refund(
  orderId: string,
  intent: string | null,
  stripe: StripeLike,
  reason: string
): Promise<WebhookOutcome> {
  if (intent) {
    await stripe.refunds.create(
      { payment_intent: intent, reason: 'duplicate', metadata: { orderId } },
      { idempotencyKey: `pulse-refund-${orderId}` }
    )
  }
  await db
    .update(pulseOrder)
    .set({
      status: 'refunded',
      refundedAt: new Date(),
      note: `Refunded automatically: ${reason}`.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(pulseOrder.id, orderId))
  return { handled: true, note: `refunded: ${reason}` }
}

/* ------------------------------ Admin ----------------------------- */

export async function listOrders(limit = 50) {
  return db
    .select({
      order: pulseOrder,
      businessName: business.name,
      runPublicId: aeoRun.publicId,
    })
    .from(pulseOrder)
    .leftJoin(business, eq(business.id, pulseOrder.businessId))
    .leftJoin(aeoRun, eq(aeoRun.id, pulseOrder.runId))
    .where(inArray(pulseOrder.status, ['paid', 'refunded']))
    .orderBy(desc(pulseOrder.createdAt))
    .limit(limit)
}

export async function revenueSince(since: Date): Promise<{ orders: number; netCents: number; taxCents: number }> {
  const [row] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      netCents: sql<number>`coalesce(sum(${pulseOrder.amountSubtotal}), 0)::int`,
      taxCents: sql<number>`coalesce(sum(${pulseOrder.amountTax}), 0)::int`,
    })
    .from(pulseOrder)
    .where(and(eq(pulseOrder.status, 'paid'), gte(pulseOrder.paidAt, since)))
  return row ?? { orders: 0, netCents: 0, taxCents: 0 }
}
