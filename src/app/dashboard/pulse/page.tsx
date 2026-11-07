import Link from 'next/link'
import { AutoRefresh } from '@/components/aeo/AutoRefresh'
import { ConfirmSubmit } from '@/components/aeo/ConfirmSubmit'
import { Card } from '@/components/ui/Card'
import { estimateRunCostUsd } from '@/lib/aeo/business-panel'
import { PULSE_ENGINES, workerConfig } from '@/lib/aeo/config'
import { listPulseBusinesses, listPulseRuns, type PulseBusiness, type PulseRunRow } from '@/lib/aeo/pulse'
import { spentTodayUsd } from '@/lib/aeo/queue'
import { requireAdmin } from '@/lib/session'
import { startFreePulseRun } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pulse | BusinessPulse' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const ENGINE_LABEL: Record<string, string> = {
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  openai: 'ChatGPT',
  claude: 'Claude',
}

const STATUS: Record<PulseRunRow['status'], { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-gray-100 text-text-secondary' },
  running: { label: 'Running', className: 'bg-amber-100 text-amber-800' },
  done: { label: 'Done', className: 'bg-success/10 text-success' },
  failed: { label: 'Failed', className: 'bg-danger/10 text-danger' },
}

const BRIEF_LABEL: Record<string, string> = {
  queued: 'Waiting to read',
  reading: 'Reading site',
  ready: 'Waiting for client',
  confirmed: 'Confirmed',
  failed: 'Failed',
}

function panelLabel(b: PulseBusiness): string {
  if (b.approvedVersion) return 'Panel v' + b.approvedVersion + ', ' + b.approvedQuestions + ' questions'
  return b.draftWaiting ? 'Panel draft waiting' : 'No approved panel'
}

function startMessage(b: PulseBusiness): string {
  const questions = b.approvedQuestions ?? 0
  return (
    'Start a free Pulse run for ' + b.name + '? It asks the ' + questions +
    ' approved questions on all four assistants, about $' + estimateRunCostUsd(questions).toFixed(0) + ' in AI spend.'
  )
}

function formatDate(date: Date | null): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(date)
}

/** Wall time from the first claim to the finish, or so far while running. */
function duration(run: PulseRunRow): string {
  if (!run.startedAt) return '-'
  const end = run.finishedAt ?? (run.status === 'running' ? new Date() : null)
  if (!end) return '-'
  const minutes = Math.round((end.getTime() - run.startedAt.getTime()) / 60000)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

export default async function PulsePage({ searchParams }: Props) {
  await requireAdmin()
  const params = await searchParams
  const notice = typeof params.notice === 'string' ? params.notice : null
  const error = typeof params.error === 'string' ? params.error : null
  const config = workerConfig()
  const [businesses, runs, spent] = await Promise.all([listPulseBusinesses(), listPulseRuns(), spentTodayUsd('pulse')])
  const active = runs.some((r) => r.status === 'queued' || r.status === 'running')

  return (
    <div className="space-y-8">
      {active && <AutoRefresh seconds={20} />}
      <div>
        <h1 className="text-2xl font-bold text-dark">Pulse</h1>
        <p className="mt-1 text-text-secondary">
          Client businesses and their full reports: each business&apos;s own approved question panel (up to{' '}
          {config.pulseMaxQuestions} questions) on ChatGPT, Claude, Perplexity, and Gemini. Pulse spend today: $
          {spent.toFixed(2)} of the ${config.pulseDailyCapUsd.toFixed(0)} daily cap.
        </p>
        {notice && <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}
        {error && <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-dark">Businesses</h2>
        <Card className="mt-3 overflow-x-auto p-0">
          {businesses.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">
              No client businesses yet. A business appears here once its account sets one up at /account/business.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-gray-50 text-xs text-text-secondary">
                <tr>
                  <th className="px-4 py-2 font-medium">Business</th>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Industry</th>
                  <th className="px-4 py-2 font-medium">Brief</th>
                  <th className="px-4 py-2 font-medium">Runs</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {businesses.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/pulse/${b.id}`} className="font-medium text-dark hover:underline">
                        {b.name}
                      </Link>
                      <p className="text-xs text-text-secondary">{b.domain}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{b.ownerEmail}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {b.panelSlug ?? <span className="text-amber-800">Custom: {b.customIndustry}</span>}
                      <p className="text-xs">{panelLabel(b)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/pulse/${b.id}`} className="text-primary hover:underline">
                        {b.briefStatus ? BRIEF_LABEL[b.briefStatus] : 'None'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{b.runs}</td>
                    <td className="px-4 py-3 text-right">
                      {b.activeRun ? (
                        <span className="text-xs text-text-secondary">Run in progress</span>
                      ) : b.approvedVersion ? (
                        <form action={startFreePulseRun}>
                          <input type="hidden" name="businessId" value={b.id} />
                          <ConfirmSubmit
                            message={startMessage(b)}
                            className="bg-primary text-white hover:bg-primary/90"
                          >
                            Start Pulse run
                          </ConfirmSubmit>
                        </form>
                      ) : (
                        <Link href={'/dashboard/pulse/' + b.id} className="text-xs text-primary hover:underline">
                          {b.draftWaiting ? 'Panel to review' : 'Needs an approved panel'}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-dark">Runs</h2>
        <Card className="mt-3 overflow-x-auto p-0">
          {runs.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No Pulse runs yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-gray-50 text-xs text-text-secondary">
                <tr>
                  <th className="px-4 py-2 font-medium">Business</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Answers by assistant</th>
                  <th className="px-4 py-2 font-medium">Cited</th>
                  <th className="px-4 py-2 font-medium">AI spend</th>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => (
                  <tr key={run.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-dark">{run.businessName}</p>
                      <p className="text-xs text-text-secondary">{run.domain}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS[run.status].className}`}>
                        {STATUS[run.status].label}
                      </span>
                      {run.attempts > 1 && (
                        <p className="mt-1 text-xs text-text-secondary">Attempt {run.attempts}</p>
                      )}
                      {run.error && run.status !== 'done' && (
                        <p className="mt-1 max-w-xs text-xs text-danger">{run.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {PULSE_ENGINES.map((engine) => (
                        <p key={engine}>
                          {ENGINE_LABEL[engine]}: {run.answersByEngine[engine] ?? 0}
                        </p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {run.status === 'done' ? `${run.citedCount} of ${run.questionCount}` : '-'}
                    </td>
                    <td className={`px-4 py-3 ${run.costUsd > 40 ? 'font-medium text-danger' : 'text-text-secondary'}`}>
                      ${run.costUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{duration(run)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(run.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {run.status === 'done' && (
                        <Link
                          href={`/report/${run.publicId}?full=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Report
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <p className="mt-2 text-xs text-text-secondary">
          Spend over $40 on one run shows in red. The client account report arrives in P7; until then, Pulse reports
          open only for admins.
        </p>
      </section>
    </div>
  )
}
