import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AutoRefresh } from '@/components/aeo/AutoRefresh'
import { PublicHeader } from '@/components/site/PublicHeader'
import { PulseReportView } from '@/components/pulse/PulseReportView'
import { FixOffer } from '@/components/account/FixOffer'
import { Card } from '@/components/ui/Card'
import { currentFixRequest, fixPriceCents } from '@/lib/aeo/fix-requests'
import { findOwnedPulseRun } from '@/lib/account/business'
import { loadPulseReport } from '@/lib/aeo/pulse-report-jobs'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your AI search report | BusinessPulse', robots: { index: false } }

type Props = {
  params: Promise<{ publicId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** A client's own Pulse report. Private: only the business's signed-in owner gets past the lookup. */
export default async function AccountReportPage({ params, searchParams }: Props) {
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
  const query = await searchParams
  const fix = await currentFixRequest(user.id)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      {writing && <AutoRefresh seconds={20} />}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <Link href="/account" className="text-sm text-primary hover:underline">
          Your account
        </Link>
        <div className="mt-4">
          {typeof query.error === 'string' && (
            <p className="mb-6 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{query.error}</p>
          )}
          {query.fix === 'requested' && (
            <p className="mb-6 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              Request sent. We&apos;ll confirm the scope by email, usually within 1 to 2 business days.
            </p>
          )}
          <PulseReportView
            report={report}
            afterFixes={
              <FixOffer
                publicId={publicId}
                priceCents={fixPriceCents()}
                issues={report.fixes.length}
                current={fix ? { status: fix.status, forThisReport: fix.reportPublicId === publicId } : null}
              />
            }
          />
        </div>
      </main>
    </div>
  )
}
