import type { Metadata } from 'next'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { PublicHeader } from '@/components/site/PublicHeader'
import { Card } from '@/components/ui/Card'
import { isAdmin, requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your account | BusinessPulse' }

/**
 * A customer's own area. Placeholder until accounts milestone A4 adds their
 * reports, re-runs, and Monitor (docs/customer-accounts-plan.md §3.4).
 */
export default async function AccountPage() {
  const session = await requireSession()
  const { user } = session

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-dark">Your account</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {user.name} · {user.email}
            </p>
          </div>
          <SignOutButton />
        </div>

        {isAdmin(session) && (
          <p className="mt-6 text-sm">
            You&apos;re an admin.{' '}
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              Go to the dashboard
            </Link>
          </p>
        )}

        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-dark">Your reports</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Your snapshots and 30-day re-checks will show here, so you can see how AI search answers change over time.
            Until then, your report links arrive by email.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Get a free snapshot
          </Link>
        </Card>
      </main>
    </div>
  )
}
