import Link from 'next/link'
import { payFixAction, withdrawFixAction } from '@/app/account/actions'
import { Card } from '@/components/ui/Card'
import type { FixRequest } from '@/lib/aeo/fix-requests'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })

function dollars(cents: number): string {
  return '$' + (cents / 100).toFixed(cents % 100 ? 2 : 0)
}

/** The client's fix request and what happens next. Hidden once withdrawn or refunded. */
export function FixCard({ request, paymentsReady }: { request: FixRequest & { reportPublicId: string | null }; paymentsReady: boolean }) {
  if (request.status === 'withdrawn' || request.status === 'refunded') return null
  const report = request.reportPublicId ? (
    <Link href={'/account/reports/' + request.reportPublicId} className="text-primary hover:underline">
      your report
    </Link>
  ) : (
    'your report'
  )

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-semibold text-dark">Your fix request</h2>
      <p className="mt-1 text-xs text-text-secondary">
        Requested {dateFormat.format(request.createdAt)} from {report} · {request.issues.length} issues
      </p>

      {request.status === 'requested' && (
        <p className="mt-3 text-sm text-dark">
          We&apos;re reviewing it and will confirm the scope by email, usually within 1 to 2 business days.
        </p>
      )}

      {request.status === 'quoted' && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-dark">
            Ready to start: <strong>{dollars(request.amountCents)}</strong>, one time, plus sales tax for New Jersey buyers.
          </p>
          {request.scope && (
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold text-text-secondary">What&apos;s included</p>
              <p className="mt-1 whitespace-pre-wrap text-dark">{request.scope}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            {paymentsReady ? (
              <form action={payFixAction}>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                  Pay {dollars(request.amountCents)} and start
                </button>
              </form>
            ) : (
              <span className="text-text-secondary">Payments open soon.</span>
            )}
            <form action={withdrawFixAction}>
              <button type="submit" className="text-sm text-text-secondary hover:underline">
                Withdraw request
              </button>
            </form>
          </div>
          <p className="text-xs text-text-secondary">
            You pay on Stripe&apos;s secure checkout page. By paying you agree to our{' '}
            <Link href="/terms" className="underline">
              terms
            </Link>
            .
          </p>
        </div>
      )}

      {request.status === 'paid' && <p className="mt-3 text-sm text-dark">Paid, thank you. We&apos;ll start on your website shortly.</p>}
      {request.status === 'in_progress' && <p className="mt-3 text-sm text-dark">We&apos;re working on your website now.</p>}
      {request.status === 'done' && (
        <div className="mt-3 text-sm text-dark">
          <p>Done{request.doneAt ? ' on ' + dateFormat.format(request.doneAt) : ''}. Your next Pulse report shows what changed.</p>
          {request.adminNote && <p className="mt-2 whitespace-pre-wrap text-text-secondary">{request.adminNote}</p>}
        </div>
      )}
      {request.status === 'declined' && (
        <div className="mt-3 text-sm text-dark">
          <p>We couldn&apos;t take this one on. You weren&apos;t charged.</p>
          {request.adminNote && <p className="mt-2 whitespace-pre-wrap text-text-secondary">{request.adminNote}</p>}
        </div>
      )}
      {request.status === 'requested' && (
        <form action={withdrawFixAction} className="mt-3">
          <button type="submit" className="text-sm text-text-secondary hover:underline">
            Withdraw request
          </button>
        </form>
      )}
    </Card>
  )
}
