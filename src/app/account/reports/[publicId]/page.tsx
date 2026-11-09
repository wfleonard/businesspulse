import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AutoRefresh } from '@/components/aeo/AutoRefresh'
import { PublicHeader } from '@/components/site/PublicHeader'
import { PulseReportView } from '@/components/pulse/PulseReportView'
import { Card } from '@/components/ui/Card'
import { findOwnedPulseRun } from '@/lib/account/business'
import { loadPulseReport } from '@/lib/aeo/pulse-report-jobs'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your AI search report | BusinessPulse', robots: { index: false } }

type Props = { params: Promise<{ publicId: string }> }

/** A client's own Pulse report. Private: only the business's signed-in owner gets past the lookup. */
export default async function AccountReportPage({ params }: Props) {
  const { user } = await requireSession()
  const { publicId } = await params
  const runId = await findOwnedPulseRun(user.id, publicId)
  if (!runId) notFound()
  const report = await loadPulseReport(runId)
  if (!report) {
    // The run is theirs but hasn't finished: show where it stands, not a 404.
    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <AutoRefresh seconds={30} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
          <Link href="/account" className="text-sm text-primary hover:underline">
            Your account
          </Link>
          <Card className="mt-6">
            <h1 className="text-xl font-bold text-dark">Your report is being prepared</h1>
            <p className="mt-2 text-sm text-text-secondary">
              We&apos;re asking ChatGPT, Claude, Perplexity, and Gemini your buyer questions. It usually takes 30 to 60
              minutes. This page updates on its own, and we&apos;ll email you when it&apos;s ready.
            </p>
          </Card>
        </main>
      </div>
    )
  }
  const writing = report.reportStatus === 'queued' || report.reportStatus === 'writing'

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      {writing && <AutoRefresh seconds={20} />}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <Link href="/account" className="text-sm text-primary hover:underline">
          Your account
        </Link>
        <div className="mt-4">
          <PulseReportView report={report} />
        </div>
      </main>
    </div>
  )
}
