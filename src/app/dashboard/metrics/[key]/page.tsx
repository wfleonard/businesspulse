import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOrg } from '@/lib/org'
import { listDefinitions, getSeries } from '@/lib/metrics/queries'
import { formatValue, formatPeriodRange } from '@/lib/metrics/period'
import { Card } from '@/components/ui/Card'
import { MetricChart, type ChartPoint } from '@/components/metrics/MetricChart'

export default async function MetricDetailPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  const { orgId } = await requireOrg()

  const def = (await listDefinitions(orgId)).find((d) => d.key === key)
  if (!def) notFound()

  const series = await getSeries(orgId, key)
  const chartData: ChartPoint[] = series.map((p) => ({
    label: p.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: p.value,
  }))
  const recent = [...series].reverse().slice(0, 12)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          ← Back to Business Pulse
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-dark">{def.label}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {def.key}
          {def.unit ? ` · ${def.unit}` : ''} ·{' '}
          {def.direction === 'up_good' ? 'higher is better' : 'lower is better'}
          {def.target != null ? ` · target ${formatValue(def.target, def.unit)}` : ''}
        </p>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Trend</h2>
        <MetricChart data={chartData} />
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Recent values</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-text-secondary">No values recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary">
                <th className="py-1 font-medium">Period</th>
                <th className="py-1 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((p, i) => (
                <tr key={i}>
                  <td className="py-2">{formatPeriodRange(p.periodStart, p.periodEnd)}</td>
                  <td className="py-2 text-right font-medium text-dark">
                    {formatValue(p.value, def.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
