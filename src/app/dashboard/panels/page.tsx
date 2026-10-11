import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { listBacklog, listPanels, type BacklogRow } from '@/lib/aeo/panel-admin'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Panels | BusinessPulse' }

function formatDate(date: Date | null): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(date)
}

const STATUS: Record<'live' | BacklogRow['status'], { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-success/10 text-success' },
  drafted: { label: 'Draft ready', className: 'bg-amber-100 text-amber-800' },
  planned: { label: 'Planned', className: 'bg-gray-100 text-text-secondary' },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-text-secondary line-through' },
}

export default async function PanelsPage() {
  await requireSession()
  const [panels, backlog] = await Promise.all([listPanels(), listBacklog()])
  const liveCount = backlog.filter((b) => b.live).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-dark">Panels</h1>
        <p className="mt-1 text-text-secondary">
          The question sets snapshots ask, by industry. Open a panel to improve it from what its runs found.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-gray-50 text-xs text-text-secondary">
            <tr>
              <th className="px-4 py-2 font-medium">Panel</th>
              <th className="px-4 py-2 text-right font-medium">Version</th>
              <th className="px-4 py-2 text-right font-medium">Questions</th>
              <th className="px-4 py-2 text-right font-medium">Runs, all (last 30 days)</th>
              <th className="px-4 py-2 font-medium">Last run</th>
              <th className="px-4 py-2 font-medium">Managed in</th>
            </tr>
          </thead>
          <tbody>
            {panels.map((p) => (
              <tr key={p.slug} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/panels/${p.slug}`} className="font-medium text-primary hover:underline">
                    {p.name}
                  </Link>
                  {!p.isActive && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-text-secondary">inactive</span>}
                  <p className="text-xs text-text-secondary">{p.slug}</p>
                </td>
                <td className="px-4 py-2 text-right">v{p.version}</td>
                <td className="px-4 py-2 text-right">{p.questionCount}</td>
                <td className="px-4 py-2 text-right">
                  {p.runs} <span className="text-text-secondary">({p.runs30d})</span>
                </td>
                <td className="px-4 py-2 text-text-secondary">{formatDate(p.lastRunAt)}</td>
                <td className="px-4 py-2 text-text-secondary">{p.editedAt ? 'Dashboard' : 'Code'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div>
        <h2 className="text-xl font-bold text-dark">Backlog</h2>
        <p className="mt-1 text-text-secondary">
          {backlog.length} industries worth a panel, ranked by likely demand. {liveCount} live. Open one to have Claude
          draft it, then review and publish.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-gray-50 text-xs text-text-secondary">
            <tr>
              <th className="px-4 py-2 text-right font-medium">#</th>
              <th className="px-4 py-2 font-medium">Industry</th>
              <th className="px-4 py-2 font-medium">Why</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {backlog.map((b) => {
              const status = STATUS[b.live ? 'live' : b.status]
              return (
                <tr key={b.slug} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-2 text-right text-text-secondary">{b.rank}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={b.live ? `/dashboard/panels/${b.slug}` : `/dashboard/panels/backlog/${b.slug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {b.name}
                    </Link>
                    <p className="text-xs text-text-secondary">{b.buyers}</p>
                  </td>
                  <td className="max-w-md px-4 py-2 text-text-secondary">{b.rationale}</td>
                  <td className="px-4 py-2">
                    <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs ${status.className}`}>{status.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
