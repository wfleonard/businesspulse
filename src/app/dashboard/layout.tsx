import Link from 'next/link'
import { requireSession } from '@/lib/session'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireSession()

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-dark">
              BusinessPulse
            </Link>
            <nav className="flex items-center gap-4 text-sm text-text-secondary">
              <Link href="/dashboard" className="hover:text-dark">
                Pulse
              </Link>
              <Link href="/dashboard/ask" className="hover:text-dark">
                Ask
              </Link>
              <Link href="/dashboard/alerts" className="hover:text-dark">
                Alerts
              </Link>
              <Link href="/dashboard/metrics" className="hover:text-dark">
                Metrics
              </Link>
              <Link href="/dashboard/sources" className="hover:text-dark">
                Sources
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-secondary">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
