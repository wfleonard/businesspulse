import Link from 'next/link'
import { Sparkles, Bell } from 'lucide-react'
import { requireOrg } from '@/lib/org'
import { buildDashboardSummary } from '@/lib/metrics/queries'
import { countOpenAlerts } from '@/lib/watch/store'
import { MetricCard } from '@/components/metrics/MetricCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const metadata = { title: 'Business Pulse — Dashboard' }

export default async function DashboardPage() {
  const { orgName, orgId } = await requireOrg()
  const [summary, openAlerts] = await Promise.all([
    buildDashboardSummary(orgId),
    countOpenAlerts(orgId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Business Pulse</h1>
          <p className="mt-1 text-text-secondary">{orgName} — today’s key numbers</p>
        </div>
        <Link href="/dashboard/metrics">
          <Button variant="secondary">Manage metrics</Button>
        </Link>
      </div>

      {openAlerts > 0 && (
        <Link href="/dashboard/alerts" className="block">
          <Card className="flex items-center justify-between border-amber-300 bg-amber-50 transition-shadow hover:shadow-md">
            <span className="flex items-center gap-2 text-sm text-dark">
              <Bell size={16} className="text-amber-600" />
              {openAlerts} {openAlerts === 1 ? 'thing' : 'things'} changed in your business.
            </span>
            <span className="text-sm font-medium text-amber-700">Review →</span>
          </Card>
        </Link>
      )}

      <Link href="/dashboard/ask" className="block">
        <Card className="flex items-center justify-between border-primary/30 bg-primary/5 transition-shadow hover:shadow-md">
          <span className="flex items-center gap-2 text-sm text-dark">
            <Sparkles size={16} className="text-primary" />
            Ask anything about your business — grounded in these numbers.
          </span>
          <span className="text-sm font-medium text-primary">Ask →</span>
        </Card>
      </Link>

      {summary.length === 0 ? (
        <Card>
          <h2 className="text-sm font-semibold text-dark">No metrics yet</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Define your first metric and enter or import some values to see your pulse.
          </p>
          <div className="mt-4">
            <Link href="/dashboard/metrics">
              <Button>Add metrics</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((m) => (
            <MetricCard key={m.key} m={m} />
          ))}
        </div>
      )}
    </div>
  )
}
