import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ConfirmSubmit } from '@/components/aeo/ConfirmSubmit'
import { PulseReportView } from '@/components/pulse/PulseReportView'
import { db } from '@/lib/db'
import { aeoRun } from '@/lib/db/schema'
import { loadPulseReport } from '@/lib/aeo/pulse-report-jobs'
import { requireAdmin } from '@/lib/session'
import { and, eq } from 'drizzle-orm'
import { rewriteFixes } from '../../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pulse report | BusinessPulse' }

type Props = { params: Promise<{ publicId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

/** The client's Pulse report exactly as they see it, for the admin. */
export default async function AdminPulseReportPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { publicId } = await params
  const notice = (await searchParams).notice
  const [run] = await db
    .select({ id: aeoRun.id })
    .from(aeoRun)
    .where(and(eq(aeoRun.publicId, publicId), eq(aeoRun.tier, 'pulse')))
    .limit(1)
  if (!run) notFound()
  const report = await loadPulseReport(run.id)
  if (!report) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-2 text-xs text-text-secondary">
        <span>
          <Link href="/dashboard/pulse" className="font-medium text-primary hover:underline">
            Back to Pulse
          </Link>{' '}
          · The client sees this page at /account/reports/{publicId} · fix list: {report.reportStatus ?? 'not written'}
        </span>
        <form action={rewriteFixes}>
          <input type="hidden" name="runId" value={run.id} />
          <input type="hidden" name="publicId" value={publicId} />
          <ConfirmSubmit
            message="Check the site again and rewrite the fix list? About $0.50 in AI spend. The client is not emailed again."
            className="border border-border bg-white text-dark hover:bg-gray-50"
          >
            Rewrite fix list
          </ConfirmSubmit>
        </form>
      </div>
      {typeof notice === 'string' && <p className="mb-6 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}
      <PulseReportView report={report} />
    </div>
  )
}
