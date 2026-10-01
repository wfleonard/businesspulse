import type { Metadata } from 'next'
import Link from 'next/link'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { PublicHeader } from '@/components/site/PublicHeader'
import { Card } from '@/components/ui/Card'
import { MONITOR_PRICE_USD, MONITOR_QUESTIONS, monitorPageState } from '@/lib/aeo/monitor'
import { joinWaitlist } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'BusinessPulse Monitor | BusinessPulse',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function MonitorPage({ searchParams }: Props) {
  const raw = (await searchParams).r
  const publicId = typeof raw === 'string' ? raw : null
  const state = await monitorPageState(publicId)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
        <p className="text-sm font-medium text-primary">Coming soon</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-dark sm:text-4xl">
          Track your AI search visibility every month
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          BusinessPulse Monitor isn&apos;t open yet. It will be ${MONITOR_PRICE_USD} a month, for businesses that want to
          do the work themselves and see whether it&apos;s paying off.
        </p>

        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-dark">
          <li>
            <span className="font-semibold">The same {MONITOR_QUESTIONS} buyer questions every month,</span> so the
            comparison is fair.
          </li>
          <li>
            <span className="font-semibold">Four AI assistants:</span> ChatGPT, Claude, Perplexity, and Gemini.
          </li>
          <li>
            <span className="font-semibold">A monthly report and email</span> showing what changed: questions you
            started winning, ones you lost, and new sites cited instead of you.
          </li>
          <li>
            <span className="font-semibold">Month to month.</span> Cancel anytime. Sales tax added where it applies.
          </li>
        </ul>

        <Card className="mt-8">
          {state.kind === 'open' && (
            <form action={joinWaitlist}>
              <input type="hidden" name="r" value={publicId ?? ''} />
              <p className="text-sm text-dark">
                Want it for <span className="font-semibold">{state.domain}</span>? Join the waitlist and we&apos;ll
                email you once, at the address your snapshot went to, when Monitor opens. Nothing is charged.
              </p>
              <button
                type="submit"
                className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Join the waitlist
              </button>
            </form>
          )}
          {state.kind === 'joined' && (
            <p className="text-sm text-dark">
              <span className="font-semibold">You&apos;re on the list for {state.domain}.</span> We&apos;ll email you
              when Monitor opens.
            </p>
          )}
          {(state.kind === 'none' || state.kind === 'erased') && (
            <p className="text-sm text-dark">
              Monitor starts from a snapshot. <Link href="/" className="text-primary hover:underline">Run a free
              snapshot</Link>, then join the waitlist from your report.
            </p>
          )}
        </Card>
      </main>
      <GoogleAnalytics />
    </div>
  )
}
