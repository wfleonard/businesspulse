import Link from 'next/link'
import { requireOrg } from '@/lib/org'
import { aiConfigured } from '@/lib/ai/model'
import { listRecommendations, type RecommendationRow } from '@/lib/actions/store'
import { Card } from '@/components/ui/Card'
import { GenerateButton, RecommendationControls } from '@/components/actions/ActionControls'

export const metadata = { title: 'Actions — BusinessPulse' }

const priorityClass = {
  high: 'bg-danger/10 text-danger',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-gray-100 text-text-secondary',
} as const

const statusLabel = {
  suggested: 'Suggested',
  accepted: 'Accepted',
  dismissed: 'Dismissed',
  done: 'Done',
} as const

function RecItem({ r }: { r: RecommendationRow }) {
  const muted = r.status === 'dismissed' || r.status === 'done'
  return (
    <li className={`py-3 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${priorityClass[r.priority]}`}>
              {r.priority}
            </span>
            <span className="text-sm font-semibold text-dark">{r.title}</span>
            {r.status !== 'suggested' && (
              <span className="text-xs text-text-secondary">· {statusLabel[r.status]}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">{r.rationale}</p>
          {r.metricRefs.length > 0 && (
            <div className="mt-2">
              {r.metricRefs.map((k) => (
                <Link
                  key={k}
                  href={`/dashboard/metrics/${k}`}
                  className="mr-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  {k}
                </Link>
              ))}
            </div>
          )}
        </div>
        <RecommendationControls id={r.id} status={r.status} />
      </div>
    </li>
  )
}

export default async function ActionsPage() {
  const { orgId } = await requireOrg()
  const recs = await listRecommendations(orgId)
  const configured = aiConfigured()

  const open = recs.filter((r) => r.status === 'suggested' || r.status === 'accepted')
  const closed = recs.filter((r) => r.status === 'dismissed' || r.status === 'done')

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Actions</h1>
          <p className="mt-1 text-text-secondary">
            AI-recommended next steps, grounded in your metrics — accept, dismiss, or mark done.
          </p>
        </div>
        <GenerateButton />
      </div>

      {!configured && (
        <Card className="border-primary/30 bg-primary/5">
          <p className="text-sm text-dark">
            Set <code>ANTHROPIC_API_KEY</code> to generate recommendations.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-dark">Open</h2>
        {open.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No open recommendations. Click “Suggest actions” to generate some.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {open.map((r) => (
              <RecItem key={r.id} r={r} />
            ))}
          </ul>
        )}
      </Card>

      {closed.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-dark">History</h2>
          <ul className="divide-y divide-border">
            {closed.map((r) => (
              <RecItem key={r.id} r={r} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
