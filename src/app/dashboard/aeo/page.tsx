import { Card } from '@/components/ui/Card'

export const metadata = { title: 'BusinessPulse — Leads' }

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Leads</h1>
        <p className="mt-1 text-text-secondary">AI search visibility snapshot requests.</p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-dark">No leads yet</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Snapshot requests will appear here once the public form and worker are live.
        </p>
      </Card>
    </div>
  )
}
