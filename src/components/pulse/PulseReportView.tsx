import { Card } from '@/components/ui/Card'
import type { FixItem } from '@/lib/aeo/fixes'
import { OpenOnHash } from './OpenOnHash'
import type { LoadedPulseReport } from '@/lib/aeo/pulse-report-jobs'
import type { Verdict } from '@/lib/aeo/report'
import { cn } from '@/lib/utils'

const VERDICT: Record<Verdict, { label: string; className: string }> = {
  cited: { label: 'Cited your site', className: 'bg-success/10 text-success' },
  directory: { label: 'Via a listing', className: 'bg-amber-100 text-amber-800' },
  named: { label: 'Named you, no link', className: 'bg-amber-100 text-amber-800' },
  absent: { label: 'Not mentioned', className: 'bg-gray-100 text-text-secondary' },
  no_search: { label: 'Answered from memory', className: 'bg-gray-100 text-text-secondary' },
  error: { label: 'No answer', className: 'bg-gray-100 text-text-secondary' },
}

const PRIORITY: Record<FixItem['priority'], { label: string; className: string }> = {
  high: { label: 'Do first', className: 'bg-danger/10 text-danger' },
  medium: { label: 'Next', className: 'bg-amber-100 text-amber-800' },
  low: { label: 'When you can', className: 'bg-gray-100 text-text-secondary' },
}

const EFFORT: Record<FixItem['effort'], string> = {
  small: 'An hour or two',
  medium: 'A day or two',
  large: 'A bigger project',
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })

function percent(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0
}

function Bar({ part, whole }: { part: number; whole: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-100" aria-hidden="true">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${percent(part, whole)}%` }} />
    </div>
  )
}

function Section({ title, intro, children, id }: { title: string; intro?: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="mt-10" id={id}>
      <h2 className="text-xl font-semibold text-dark">{title}</h2>
      {intro && <p className="mt-1 text-sm text-text-secondary">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/**
 * The client's Pulse report (docs/pulse-plan.md §4.4): the headline, what to
 * fix, the site checks, and every question with every assistant's answer.
 */
export function PulseReportView({
  report,
  afterFixes,
}: {
  report: LoadedPulseReport
  /** Shown under the fix list: the client's $500 fix offer. */
  afterFixes?: React.ReactNode
}) {
  const { summary, trend, fixes, checks, business, run } = report
  const questionIndex = new Map(summary.questions.map((q, i) => [q.query, i]))
  const checkLabel = new Map(checks.map((c) => [c.id, c.label]))
  const assistants = summary.engines.map((e) => e.label).join(', ').replace(/, ([^,]*)$/, ', and $1')
  const delta = trend ? summary.citedCount - trend.previousCited : 0

  return (
    <div>
      <OpenOnHash />
      <p className="text-sm font-medium text-primary">Pulse report</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-dark sm:text-4xl">AI search report for {business.name}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        {[business.domain, ...business.otherDomains].join(', ')} · {run.finishedAt ? dateFormat.format(run.finishedAt) : ''}
      </p>

      <Card className="mt-8">
        <p className="text-sm text-text-secondary">Your website was cited on</p>
        <p className="mt-1 text-4xl font-bold text-dark">
          {summary.citedCount} of {summary.answeredCount} questions
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          At least one of {assistants} linked to your site when asked these buyer questions.
          {summary.namedCount > 0 && ` On ${summary.namedCount} more, an answer named your business without linking to it.`}
        </p>
        {trend && (
          <p className={cn('mt-3 text-sm font-medium', delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-dark')}>
            {delta > 0 ? `Up ${delta}` : delta < 0 ? `Down ${-delta}` : 'No change'} from {trend.previousCited} of{' '}
            {trend.previousQuestions} on {dateFormat.format(trend.previousDate)}.
            {!trend.samePanel && (
              <span className="font-normal text-text-secondary"> Your questions changed since then, so compare with care.</span>
            )}
          </p>
        )}
        <p className="mt-4 text-xs text-text-secondary">
          Each assistant decides for itself whether to search the web. When it answers from memory, it links to no
          website at all, yours or anyone else&apos;s.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {summary.engines.map((e) => {
            const before = trend?.engines.find((t) => t.engine === e.engine)?.before
            return (
              <div key={e.engine}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-dark">{e.label}</span>
                  <span className="text-text-secondary">
                    {e.cited} of {e.answered}
                    {before !== undefined && trend && ` (was ${before})`}
                  </span>
                </div>
                <div className="mt-1">
                  <Bar part={e.cited} whole={e.answered} />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  Searched the web on {e.searched} of {e.answered}
                  {e.searched < e.answered && `; answered ${e.answered - e.searched} from memory`}
                </p>
              </div>
            )
          })}
        </div>
      </Card>

      <Section
        id="fixes"
        title="What to fix"
        intro="Changes to your website that should help AI assistants find, read, and cite it, most important first. Each one shows the evidence behind it."
      >
        {report.reportStatus === 'ready' && fixes.length > 0 ? (
          <ol className="space-y-4">
            {fixes.map((fix, i) => (
              <li key={fix.title}>
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-secondary">{i + 1}.</span>
                    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', PRIORITY[fix.priority].className)}>
                      {PRIORITY[fix.priority].label}
                    </span>
                    <span className="text-xs text-text-secondary">{EFFORT[fix.effort]}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{fix.title}</h3>
                  <p className="mt-2 text-sm text-dark">{fix.why}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-dark">
                    {fix.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                  {(fix.evidence.questions.length > 0 || fix.evidence.checks.length > 0 || fix.evidence.sites.length > 0) && (
                    <div className="mt-4 border-t border-border pt-3 text-xs text-text-secondary">
                      {fix.evidence.questions.length > 0 && (
                        <p>
                          Questions:{' '}
                          {fix.evidence.questions.map((q, j) => (
                            <span key={q}>
                              {j > 0 && ' · '}
                              <a href={`#q-${questionIndex.get(q)}`} className="text-primary hover:underline">
                                {q}
                              </a>
                            </span>
                          ))}
                        </p>
                      )}
                      {fix.evidence.checks.length > 0 && (
                        <p className="mt-1">
                          Site checks:{' '}
                          {fix.evidence.checks.map((c) => checkLabel.get(c) ?? c).join(' · ')}
                        </p>
                      )}
                      {fix.evidence.sites.length > 0 && <p className="mt-1">Cited instead: {fix.evidence.sites.join(', ')}</p>}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">
              {report.reportStatus === 'failed'
                ? "Your fix list is taking longer than usual. We've been told and will email you when it's ready."
                : 'We’re checking your site and writing your fix list. It’s usually ready within a few minutes of your report.'}
            </p>
          </Card>
        )}
        {report.reportStatus === 'ready' && fixes.length > 0 && afterFixes}
      </Section>

      {checks.length > 0 && (
        <Section
          title="What we checked on your site"
          intro="Things that help AI assistants read your pages and know who you are, read from your live site."
        >
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-3 px-4 py-3 text-sm">
                  <span
                    className={cn(
                      'mt-0.5 h-5 shrink-0 rounded px-1.5 text-xs font-medium leading-5',
                      c.status === 'pass' ? 'bg-success/10 text-success' : c.status === 'fix' ? 'bg-danger/10 text-danger' : 'bg-gray-100 text-text-secondary'
                    )}
                  >
                    {c.status === 'pass' ? 'Good' : c.status === 'fix' ? 'Fix' : 'Optional'}
                  </span>
                  <div>
                    <p className="font-medium text-dark">{c.label}</p>
                    <p className="text-text-secondary">{c.detail}</p>
                    {c.items.length > 0 && <p className="mt-1 text-xs text-text-secondary">{c.items.slice(0, 10).join(', ')}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      <Section title="By type of question">
        <Card>
          <div className="space-y-3">
            {summary.categories.map((c) => (
              <div key={c.category}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-dark">{c.label}</span>
                  <span className="text-text-secondary">
                    {c.cited} of {c.questions}
                  </span>
                </div>
                <div className="mt-1">
                  <Bar part={c.cited} whole={c.questions} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {summary.offerings.length > 1 && (
        <Section title="By what you sell">
          <Card>
            <div className="space-y-3">
              {summary.offerings.map((o) => (
                <div key={o.offering}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-dark">{o.offering === 'general' ? 'General questions' : o.offering}</span>
                    <span className="shrink-0 text-text-secondary">
                      {o.cited} of {o.questions}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Bar part={o.cited} whole={o.questions} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {summary.rivals.length > 0 && (
        <Section title="Who AI assistants cite instead" intro="The websites linked most often on the questions where yours wasn't.">
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {summary.rivals.map((r) => (
                <li key={r.host} className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
                  <span className="text-dark">
                    {r.host}
                    {r.directory && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-text-secondary">marketplace or directory</span>}
                  </span>
                  <span className="shrink-0 text-text-secondary">{r.questions} questions</span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {trend && trend.samePanel && (trend.gained.length > 0 || trend.lost.length > 0) && (
        <Section title="What changed since your last report">
          <Card className="space-y-3 text-sm">
            {trend.gained.length > 0 && (
              <div>
                <p className="font-medium text-success">Now cited ({trend.gained.length})</p>
                <ul className="mt-1 list-disc pl-5 text-dark">
                  {trend.gained.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {trend.lost.length > 0 && (
              <div>
                <p className="font-medium text-danger">No longer cited ({trend.lost.length})</p>
                <ul className="mt-1 list-disc pl-5 text-dark">
                  {trend.lost.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </Section>
      )}

      <Section title="Every question" intro="Open a question to read what each assistant answered.">
        <ul className="space-y-2">
          {summary.questions.map((q, i) => (
            <li key={q.query} id={`q-${i}`} className="scroll-mt-20">
              <details className="rounded-lg border border-border bg-white">
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-dark">“{q.query}”</span>
                    <span className="text-xs text-text-secondary">{q.label}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.answers.map((a) => (
                      <span key={a.engine} className={cn('rounded px-2 py-0.5 text-xs', VERDICT[a.verdict].className)}>
                        {a.label}: {VERDICT[a.verdict].label}
                      </span>
                    ))}
                  </div>
                </summary>
                <div className="space-y-4 border-t border-border px-4 py-3">
                  {q.answers.map((a) => (
                    <div key={a.engine}>
                      <p className="text-xs font-semibold text-dark">{a.label}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{a.answer || 'No answer.'}</p>
                      {a.citedInstead.length > 0 && a.verdict !== 'cited' && (
                        <p className="mt-1 text-xs text-text-secondary">Cited instead: {a.citedInstead.slice(0, 6).join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Section>

      <section className="mt-10 text-xs leading-relaxed text-text-secondary">
        <h2 className="text-sm font-semibold text-dark">How this was measured</h2>
        <p className="mt-2">
          On {run.finishedAt ? dateFormat.format(run.finishedAt) : 'the report date'} we asked {assistants} {summary.questionCount}{' '}
          questions that buyers of a business like yours ask, written for your business and approved before the run
          {report.panelVersion ? ` (question set version ${report.panelVersion})` : ''}. A question counts as cited when at least
          one assistant linked to {[business.domain, ...business.otherDomains].join(' or ')}. AI answers change as the models
          and the web change, so read this as where you stand today rather than a fixed ranking.
        </p>
      </section>
    </div>
  )
}
