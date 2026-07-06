import Link from 'next/link'
import { requireOrg } from '@/lib/org'
import { listDefinitions } from '@/lib/metrics/queries'
import { listAlerts, listRules, listRecentInsights } from '@/lib/watch/store'
import { Card } from '@/components/ui/Card'
import { RuleForm } from '@/components/alerts/RuleForm'
import { AlertControls, RuleDelete, RunWatchButton } from '@/components/alerts/AlertControls'

export const metadata = { title: 'Alerts — BusinessPulse' }

const severityClass = {
  critical: 'bg-danger',
  warning: 'bg-amber-500',
  info: 'bg-primary',
} as const

const CONDITION_LABEL: Record<string, string> = {
  pct_drop: 'drops by ≥',
  pct_rise: 'rises by ≥',
  below_target: 'below target',
  above_target: 'above target',
  below_threshold: 'below',
  above_threshold: 'above',
}

export default async function AlertsPage() {
  const { orgId } = await requireOrg()
  const [defs, alerts, rules, insights] = await Promise.all([
    listDefinitions(orgId),
    listAlerts(orgId),
    listRules(orgId),
    listRecentInsights(orgId),
  ])
  const metricKeys = defs.map((d) => d.key)
  const openAlerts = alerts.filter((a) => a.status !== 'resolved')

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Business Watch</h1>
          <p className="mt-1 text-text-secondary">
            Rules watch your metrics; alerts and explanations surface here and in your morning digest.
          </p>
        </div>
        <RunWatchButton />
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Open alerts</h2>
        {openAlerts.length === 0 ? (
          <p className="text-sm text-text-secondary">Nothing needs your attention right now.</p>
        ) : (
          <ul className="divide-y divide-border">
            {openAlerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${severityClass[a.severity]}`} />
                  <div>
                    <Link href={`/dashboard/metrics/${a.metricKey}`} className="text-sm text-dark hover:underline">
                      {a.message}
                    </Link>
                    <div className="text-xs text-text-secondary">
                      {a.severity} · {a.status} · {a.createdAt.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>
                <AlertControls id={a.id} status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {insights.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-dark">Recent explanations</h2>
          <ul className="space-y-2">
            {insights.map((i, idx) => (
              <li key={idx} className="text-sm text-dark">
                <Link href={`/dashboard/metrics/${i.metricKey}`} className="font-medium text-primary hover:underline">
                  {i.metricKey}
                </Link>{' '}
                — {i.summary}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">Alert rules</h2>
        {rules.length === 0 ? (
          <p className="mb-4 text-sm text-text-secondary">No rules yet — add one below.</p>
        ) : (
          <ul className="mb-4 divide-y divide-border">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-dark">
                  <span className="font-medium">{r.metricKey}</span>{' '}
                  <span className="text-text-secondary">
                    {CONDITION_LABEL[r.condition]}
                    {r.threshold != null ? ` ${r.threshold}` : ''}
                    {['pct_drop', 'pct_rise'].includes(r.condition) ? '%' : ''}
                  </span>
                </span>
                <RuleDelete id={r.id} />
              </li>
            ))}
          </ul>
        )}
        <RuleForm metricKeys={metricKeys} />
      </Card>
    </div>
  )
}
