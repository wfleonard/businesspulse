import Link from 'next/link'
import { buyPulseRun } from '@/app/account/actions'
import { Card } from '@/components/ui/Card'
import type { PulseState } from '@/lib/aeo/payments'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })

/** The client's way to buy a Pulse report, and why they can't when they can't. */
export function PulseCard({ state, priceCents, paymentsReady }: { state: PulseState; priceCents: number; paymentsReady: boolean }) {
  const price = '$' + (priceCents / 100).toFixed(0)
  return (
    <Card className="mt-6">
      <h2 className="text-lg font-semibold text-dark">Pulse report</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Every one of your approved buyer questions on ChatGPT, Claude, Perplexity, and Gemini, with who they cite
        instead and what to fix. {price} per report, plus sales tax for New Jersey buyers. One report every 30 days.
      </p>

      {state.kind === 'ready' &&
        (paymentsReady ? (
          <form action={buyPulseRun} className="mt-4">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
              Run a new report for {price}
            </button>
            <p className="mt-2 text-xs text-text-secondary">
              You pay on Stripe&apos;s secure checkout page. By paying you agree to our{' '}
              <Link href="/terms" className="underline">
                terms
              </Link>
              .
            </p>
          </form>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">Payments open soon.</p>
        ))}
      {state.kind === 'too_soon' && (
        <p className="mt-4 text-sm text-dark">Your next report is available on {dateFormat.format(state.nextDate)}.</p>
      )}
      {state.kind === 'running' && (
        <p className="mt-4 text-sm text-dark">
          Your report is running. It usually takes 30 to 60 minutes, and we&apos;ll email you when it&apos;s ready.
        </p>
      )}
      {state.kind === 'preparing' && (
        <p className="mt-4 text-sm text-dark">
          We&apos;re preparing your buyer questions, usually within 1 to 2 business days. You can buy a report as soon as
          they&apos;re ready.
        </p>
      )}
      {state.kind === 'confirm_brief' && (
        <p className="mt-4 text-sm text-dark">
          First,{' '}
          <Link href="/account/brief" className="font-medium text-primary hover:underline">
            confirm what we found on your site
          </Link>
          . Your questions are written from it.
        </p>
      )}
      {state.kind === 'reading' && (
        <p className="mt-4 text-sm text-dark">We&apos;re reading your website first. This takes a minute or two.</p>
      )}
    </Card>
  )
}
