import type { Metadata } from 'next'
import Link from 'next/link'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { PublicHeader } from '@/components/site/PublicHeader'
import { Card } from '@/components/ui/Card'
import { signupOpen } from '@/lib/access/signup'
import { appUrl } from '@/lib/aeo/emails'
import { fixPriceCents } from '@/lib/aeo/fix-requests'
import { pulsePriceCents } from '@/lib/aeo/payments'

// Reads BP_ALLOW_SIGNUP and the prices at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pulse: your full AI search report | BusinessPulse',
  description:
    'Your own buyer questions, written from your website, asked of ChatGPT, Claude, Perplexity, and Gemini. See who they cite instead of you and what to fix. $100 per report, no subscription.',
  alternates: { canonical: appUrl('/pulse') },
}

const STEPS = [
  ['Create a free account', 'With your company email. One account covers one business.'],
  ['We read your website', 'In a minute or two: what you sell, who buys, and where you work. You confirm it or fix what we got wrong.'],
  ['We write your questions', 'The questions your buyers ask about what you actually sell, checked by us, usually within 1 to 2 business days.'],
  ['Run your report', 'Pay when you want a report. It usually finishes within an hour, and we email you when it’s ready.'],
] as const

/** The Pulse product page (docs/pulse-plan.md), where the snapshot report's offer leads. */
export default function PulsePage() {
  const price = Math.round(pulsePriceCents() / 100)
  const fix = Math.round(fixPriceCents() / 100)
  const open = signupOpen()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <p className="text-sm font-medium text-primary">BusinessPulse Pulse</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-dark sm:text-4xl">
          See where AI assistants send your buyers, and what to fix
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          A Pulse report asks ChatGPT, Claude, Perplexity, and Gemini the questions your buyers ask, written for your
          business from your own website. It shows which answers cite your site, who they cite instead, and what to
          change. ${price} per report, no subscription.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {open ? (
            <Link href="/signup" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90">
              Create a free account
            </Link>
          ) : (
            <span className="rounded-md bg-gray-100 px-5 py-2.5 text-sm font-medium text-text-secondary">Accounts open soon</span>
          )}
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Or start with a free snapshot
          </Link>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-dark">What&apos;s in a report</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-dark">
          <li>
            <strong>Your questions, not a generic list.</strong> We read your site so the report never asks about things
            you don&apos;t sell or places you don&apos;t serve.
          </li>
          <li>
            <strong>Four assistants, every answer.</strong> For each question, what ChatGPT, Claude, Perplexity, and Gemini
            said, whether they linked to your site, and which sites they linked to instead.
          </li>
          <li>
            <strong>What to fix.</strong> A short, prioritized list of changes to your site, each tied to the questions
            and checks it comes from.
          </li>
          <li>
            <strong>A check of your site.</strong> Whether AI assistants are allowed to read it, and whether your pages say
            clearly who you are and what you sell.
          </li>
          <li>
            <strong>Change over time.</strong> Run a new report up to once every 30 days and see what moved since the last
            one.
          </li>
        </ul>

        <h2 className="mt-12 text-xl font-semibold text-dark">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {STEPS.map(([title, detail], i) => (
            <li key={title}>
              <Card className="h-full">
                <p className="text-xs font-semibold text-primary">Step {i + 1}</p>
                <p className="mt-1 font-semibold text-dark">{title}</p>
                <p className="mt-1 text-sm text-text-secondary">{detail}</p>
              </Card>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-dark">Prices</h2>
        <Card className="mt-4 p-0">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium text-dark">Free snapshot</td>
                <td className="px-4 py-3 text-text-secondary">Free</td>
                <td className="px-4 py-3 text-text-secondary">20 questions for your industry on Perplexity. No account.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-dark">Pulse report</td>
                <td className="px-4 py-3 text-text-secondary">${price} per report</td>
                <td className="px-4 py-3 text-text-secondary">Your own questions on four assistants, with what to fix. Up to once every 30 days.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-dark">We fix it for you</td>
                <td className="px-4 py-3 text-text-secondary">${fix}, one time</td>
                <td className="px-4 py-3 text-text-secondary">We make the changes in your report on your website. We confirm the scope before you pay.</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <p className="mt-2 text-xs text-text-secondary">
          New Jersey sales tax is added for New Jersey buyers. See our{' '}
          <Link href="/terms" className="underline">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/resources/how-much-does-aeo-cost" className="underline">
            all our prices
          </Link>
          , including Saxon AEO&apos;s done-for-you service.
        </p>

        <p className="mt-10 text-xs leading-relaxed text-text-secondary">
          AI assistants decide for themselves what to cite, and their answers change as the models and the web change. A
          report shows where you stand on the day it runs; it doesn&apos;t promise any change, and it says nothing about
          search engine rankings.
        </p>
      </main>
      <GoogleAnalytics />
    </div>
  )
}
