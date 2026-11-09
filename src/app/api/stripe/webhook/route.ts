import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, handleStripeEvent } from '@/lib/aeo/payments'

export const dynamic = 'force-dynamic'

/**
 * Stripe webhook (docs/pulse-plan.md §4.2). Only events signed with
 * STRIPE_WEBHOOK_SECRET are applied, so a forged request changes nothing. A
 * failure answers 500 so Stripe retries; handling is idempotent.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const signature = req.headers.get('stripe-signature')
  if (!secret || !signature) return NextResponse.json({ error: 'not configured or unsigned' }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret)
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  try {
    const outcome = await handleStripeEvent(event)
    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'stripe_webhook', type: event.type, id: event.id, ...outcome }))
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(JSON.stringify({ at: new Date().toISOString(), event: 'stripe_webhook_error', type: event.type, id: event.id, error: err instanceof Error ? err.message : String(err) }))
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
  }
}
