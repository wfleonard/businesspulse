import Link from 'next/link'
import { requestFixAction } from '@/app/account/actions'
import { Card } from '@/components/ui/Card'
import type { FixStatus } from '@/lib/aeo/fix-requests'

const OPEN: Record<string, string> = {
  requested: 'We have your request and will confirm the scope by email, usually within 1 to 2 business days.',
  quoted: 'Your fix is ready to start. Review the scope and pay on your account page.',
  paid: 'Paid. We’ll start on your website shortly.',
  in_progress: 'We’re working on your website now.',
}

/**
 * The $500 fix offer under "What to fix" in the client's report
 * (docs/pulse-plan.md §4.6), or the status of the request already made.
 */
export function FixOffer({
  publicId,
  priceCents,
  issues,
  current,
}: {
  publicId: string
  priceCents: number
  issues: number
  /** The business's latest request, and whether it was made from this report. */
  current: { status: FixStatus; forThisReport: boolean } | null
}) {
  const price = '$' + (priceCents / 100).toFixed(0)
  const open = current && OPEN[current.status]

  return (
    <Card className="mt-6 border-primary/30" id="fix">
      <h3 className="text-lg font-semibold text-dark">Want us to make these fixes for you?</h3>
      {open ? (
        <p className="mt-2 text-sm text-dark">
          {current.forThisReport ? open : 'You already have a fix request open from another report.'}{' '}
          <Link href="/account" className="font-medium text-primary hover:underline">
            See its status
          </Link>
        </p>
      ) : current?.status === 'done' && current.forThisReport ? (
        <p className="mt-2 text-sm text-dark">We&apos;ve made the fixes from this report. Your next report shows what changed.</p>
      ) : (
        <form action={requestFixAction} className="mt-2 space-y-3">
          <p className="text-sm text-text-secondary">
            Saxon Enterprises makes the {issues} changes in this report on your website for {price}, one time, plus sales
            tax for New Jersey buyers. We confirm exactly what&apos;s included before you pay anything.
          </p>
          <input type="hidden" name="publicId" value={publicId} />
          <label htmlFor="fix-note" className="block text-sm font-medium text-dark">
            Anything we should know? (optional)
          </label>
          <textarea
            id="fix-note"
            name="note"
            rows={3}
            maxLength={2000}
            placeholder="For example: the site runs on WordPress, and our web designer is Pat at pat@example.com"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            Request the fix
          </button>
          <p className="text-xs text-text-secondary">Requesting is free and doesn&apos;t commit you to anything.</p>
        </form>
      )}
    </Card>
  )
}
