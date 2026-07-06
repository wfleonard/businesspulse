import Link from 'next/link'
import { requireOrg } from '@/lib/org'
import { listDefinitions } from '@/lib/metrics/queries'
import { Card } from '@/components/ui/Card'
import { DefinitionForm } from '@/components/metrics/DefinitionForm'
import { ValueForm } from '@/components/metrics/ValueForm'
import { CsvImport } from '@/components/metrics/CsvImport'

export const metadata = { title: 'Metrics — BusinessPulse' }

export default async function MetricsPage() {
  const { orgId } = await requireOrg()
  const defs = await listDefinitions(orgId)
  const keys = defs.map((d) => d.key)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Metrics</h1>
        <p className="mt-1 text-text-secondary">
          Define what you track, then enter values manually or import a CSV.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Your metrics</h2>
        {defs.length === 0 ? (
          <p className="text-sm text-text-secondary">No metrics defined yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {defs.map((d) => (
              <li key={d.key} className="flex items-center justify-between py-2">
                <div>
                  <Link
                    href={`/dashboard/metrics/${d.key}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {d.label}
                  </Link>
                  <span className="ml-2 text-xs text-text-secondary">
                    {d.key}
                    {d.unit ? ` · ${d.unit}` : ''} ·{' '}
                    {d.direction === 'up_good' ? 'higher better' : 'lower better'}
                    {d.isActive ? '' : ' · inactive'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-dark">Add / edit a metric</h2>
          <DefinitionForm />
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-dark">Record a value</h2>
          <ValueForm metricKeys={keys} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Import values (CSV)</h2>
        <CsvImport />
      </Card>
    </div>
  )
}
