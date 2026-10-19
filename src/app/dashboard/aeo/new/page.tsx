import Link from 'next/link'
import { ProspectForm } from '@/components/aeo/ProspectForm'
import { Card } from '@/components/ui/Card'
import { activePanels } from '@/lib/aeo/requests'
import { stateOptions } from '@/lib/aeo/states'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Run a snapshot | BusinessPulse' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/** Fields a link can pre-fill, such as "Run snapshot" on a scan request. */
const PREFILL = ['businessName', 'website', 'email', 'service', 'city', 'state'] as const

export default async function NewProspectSnapshotPage({ searchParams }: Props) {
  // Pages render in parallel with the layout, so each checks the session itself.
  await requireSession()
  const panels = await activePanels()
  const params = await searchParams
  const initialValues: Record<string, string> = {}
  for (const key of PREFILL) {
    const value = params[key]
    if (typeof value === 'string' && value.length <= 2048) initialValues[key] = value
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/aeo" className="text-sm text-primary hover:underline">
          Leads
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-dark">Run a prospect snapshot</h1>
        <p className="mt-1 text-sm text-text-secondary">
          For outbound: measure a prospect before you contact them, then send them the report link yourself. Nothing
          is emailed to the prospect, and a business measured in the last 30 days reuses that report instead of
          running again. The daily spend cap still applies.
        </p>
      </div>
      <Card>
        <ProspectForm panels={panels} states={stateOptions()} initialValues={initialValues} />
      </Card>
    </div>
  )
}
