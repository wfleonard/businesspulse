import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AutoRefresh } from '@/components/aeo/AutoRefresh'
import { Card } from '@/components/ui/Card'
import { loadReport, type LoadedReport, type ReportSummary, type Verdict } from '@/lib/aeo/report'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI visibility snapshot | BusinessPulse',
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ publicId: string }> }

const ENGINE_NAMES: Record<string, string> = {
  perplexity: 'Perplexity',
  openai: 'ChatGPT',
  claude: 'Claude',
}

const VERDICTS: Record<Verdict, { label: string; className: string }> = {
  cited: { label: 'Your site cited', className: 'bg-success/10 text-success' },
  directory: { label: 'Only through a directory', className: 'bg-amber-100 text-amber-800' },
  named: { label: 'Named, not linked', className: 'bg-amber-100 text-amber-800' },
  absent: { label: 'Not mentioned', className: 'bg-danger/10 text-danger' },
  no_search: { label: 'Answered without searching', className: 'bg-gray-100 text-text-secondary' },
  error: { label: 'No answer', className: 'bg-gray-100 text-text-secondary' },
}

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(date) : ''
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
      <Link href="/" className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
        BusinessPulse
      </Link>
      {children}
    </main>
  )
}

function scoreLine(summary: ReportSummary, domain: string): string {
  const { citedCount, answeredCount } = summary
  if (answeredCount === 0) return 'AI search did not return answers for these questions.'
  if (citedCount === 0) return `AI search didn't cite ${domain} on any of these questions.`
  if (citedCount * 2 < answeredCount) return `${domain} was cited on fewer than half of these questions.`
  return `${domain} was cited on most of these questions.`
}

function callToAction(): string | null {
  const booking = process.env.AEO_BOOKING_URL
  if (booking?.startsWith('https://')) return booking
  const contact = process.env.AEO_CONTACT_EMAIL
  return contact ? `mailto:${contact}?subject=${encodeURIComponent('Full AI visibility audit')}` : null
}

function Report({ report, summary }: { report: LoadedReport; summary: ReportSummary }) {
  const engineNames = report.engines.map((e) => ENGINE_NAMES[e.engine] ?? e.engine)
  const assistants = engineNames.length ? engineNames.join(', ') : 'AI search'
  const remaining = Math.max(0, summary.questionCount - summary.examples.length)
  const cta = callToAction()

  return (
    <Shell>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-dark sm:text-4xl">
        AI visibility snapshot for {report.businessName}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        {report.domain} · {formatDate(report.finishedAt)}
      </p>

      <Card className="mt-8">
        <p className="text-sm font-medium text-text-secondary">Your website was cited on</p>
        <p className="mt-1 text-4xl font-bold text-dark">
          {summary.citedCount} <span className="text-2xl font-semibold text-text-secondary">of {summary.questionCount} questions</span>
        </p>
        <p className="mt-3 text-sm text-dark">{scoreLine(summary, report.domain)}</p>
        {summary.namedCount > 0 && (
          <p className="mt-1 text-sm text-text-secondary">
            On {summary.namedCount} more, the answer named your business but didn&apos;t link to your site.
          </p>
        )}
      </Card>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-dark">By type of question</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {summary.categories.map((c) => (
                <tr key={c.category} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 text-dark">{c.label}</td>
                  <td className="w-1/2 py-2 pr-4">
                    <div className="h-2 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${c.questions ? (c.cited / c.questions) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right text-text-secondary">
                    {c.cited} of {c.questions} cited
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {summary.rivals.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-dark">Sites cited instead</h2>
          <p className="mt-1 text-sm text-text-secondary">The websites AI search pointed buyers to most often.</p>
          <ol className="mt-3 space-y-2">
            {summary.rivals.map((rival) => (
              <li key={rival.host} className="flex items-center justify-between gap-4 text-sm">
                <span className="min-w-0 truncate text-dark">
                  {rival.host}
                  {rival.directory && (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-text-secondary">directory</span>
                  )}
                </span>
                <span className="whitespace-nowrap text-text-secondary">
                  {rival.questions} {rival.questions === 1 ? 'question' : 'questions'}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {summary.examples.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-dark">What AI search said</h2>
          <div className="mt-3 space-y-4">
            {summary.examples.map((example) => (
              <Card key={example.query} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-secondary">{example.label}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${VERDICTS[example.verdict].className}`}>
                    {VERDICTS[example.verdict].label}
                  </span>
                </div>
                <p className="mt-2 font-medium text-dark">&ldquo;{example.query}&rdquo;</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">{example.excerpt}</p>
                {example.citedInstead.length > 0 && example.verdict !== 'cited' && (
                  <p className="mt-3 text-xs text-text-secondary">
                    Cited instead: <span className="text-dark">{example.citedInstead.join(', ')}</span>
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card className="mt-10 border-primary/30 bg-primary/5">
        <h2 className="text-lg font-semibold text-dark">See the full picture</h2>
        <p className="mt-2 text-sm text-dark">The full audit from Saxon AEO covers:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-dark">
          {remaining > 0 && <li>The other {remaining} questions and every answer</li>}
          <li>ChatGPT and Claude side by side with Perplexity</li>
          <li>A plan to get your site cited</li>
        </ul>
        {cta && (
          <a
            href={cta}
            className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Book a call
          </a>
        )}
      </Card>

      <section className="mt-10 text-xs leading-relaxed text-text-secondary">
        <h2 className="text-sm font-semibold text-dark">How this was measured</h2>
        <p className="mt-2">
          We asked {assistants} {summary.questionCount} questions that buyers ask about businesses like yours,
          on {formatDate(report.finishedAt)}, and checked whether each answer cited {report.domain}. AI answers
          change as the models and the web change, so treat this as a snapshot rather than a ranking.
        </p>
        {report.panelSource === 'generated' && (
          <p className="mt-2">
            Your industry isn&apos;t one of our prepared question sets yet, so these questions were generated from
            your website. Expect them to be less precise than an industry set.
          </p>
        )}
      </section>
    </Shell>
  )
}

export default async function ReportPage({ params }: Props) {
  const { publicId } = await params
  const report = await loadReport(publicId)
  if (!report) notFound()

  if (report.status === 'queued' || report.status === 'running') {
    return (
      <Shell>
        <AutoRefresh seconds={15} />
        <Card className="mt-8 text-center">
          <h1 className="text-xl font-bold text-dark">Your report is being prepared</h1>
          <p className="mt-3 text-sm text-text-secondary">
            We&apos;re asking AI search about {report.businessName}. This usually takes a few minutes. This page
            updates on its own, and we&apos;ll email you when it&apos;s ready.
          </p>
        </Card>
      </Shell>
    )
  }

  if (report.status === 'failed' || !report.summary) {
    return (
      <Shell>
        <Card className="mt-8 text-center">
          <h1 className="text-xl font-bold text-dark">We couldn&apos;t finish this report</h1>
          <p className="mt-3 text-sm text-text-secondary">
            Something went wrong on our side while checking {report.domain}. We&apos;ve been notified and will look
            into it.
          </p>
        </Card>
      </Shell>
    )
  }

  return <Report report={report} summary={report.summary} />
}
