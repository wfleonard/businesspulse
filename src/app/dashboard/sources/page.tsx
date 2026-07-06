import { requireOrg } from '@/lib/org'
import { listSources } from '@/lib/connectors/store'
import { Card } from '@/components/ui/Card'
import { AddSourceForm } from '@/components/sources/AddSourceForm'
import { SourceActions } from '@/components/sources/SourceActions'

export const metadata = { title: 'Data Sources — BusinessPulse' }

const statusClass = {
  active: 'text-success',
  paused: 'text-text-secondary',
  error: 'text-danger',
} as const

export default async function SourcesPage() {
  const { orgId } = await requireOrg()
  const sources = await listSources(orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Data Sources</h1>
        <p className="mt-1 text-text-secondary">
          Connect an external API. BusinessPulse pulls it on a schedule (or on demand) and
          normalizes it into your metrics.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Connected sources</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-text-secondary">No sources yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark">{s.name}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-text-secondary">
                      {s.kind}
                    </span>
                    <span className={`text-xs ${statusClass[s.status]}`}>{s.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {s.lastSyncedAt
                      ? `Last synced ${s.lastSyncedAt.toLocaleString('en-US')}`
                      : 'Never synced'}
                    {s.lastError ? ` · ${s.lastError}` : ''}
                  </div>
                </div>
                {s.kind === 'api' && <SourceActions id={s.id} />}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Add an API source</h2>
        <AddSourceForm />
      </Card>
    </div>
  )
}
