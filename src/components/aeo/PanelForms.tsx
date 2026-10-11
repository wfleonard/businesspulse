'use client'

import { useActionState } from 'react'
import {
  applyPanelSuggestions,
  draftBacklogPanel,
  publishBacklogDraft,
  renamePanel,
  type PanelFormState,
} from '@/app/dashboard/panels/actions'
import type { DomainSuggestion, QuestionStat } from '@/lib/aeo/panel-content'
import type { PanelQuestion } from '@/lib/aeo/questions'

const inputClass =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30'
const buttonClass =
  'rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'

function FormStatus({ state }: { state: PanelFormState }) {
  if (state.message) return <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{state.message}</p>
  if (!state.error) return null
  return (
    <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
      <p>{state.error}</p>
      {state.problems && (
        <ul className="mt-1 list-disc pl-5">
          {state.problems.slice(0, 12).map((p) => (
            <li key={p}>{p}</li>
          ))}
          {state.problems.length > 12 && <li>and {state.problems.length - 12} more</li>}
        </ul>
      )}
    </div>
  )
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '-'
}

function QuestionRows({ stats }: { stats: QuestionStat[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-text-secondary">
        <tr>
          <th className="w-16 py-1 pr-2 font-normal">Remove</th>
          <th className="py-1 pr-2 font-normal">Question</th>
          <th className="py-1 pr-2 text-right font-normal" title="Runs that asked it">Asked</th>
          <th className="py-1 pr-2 text-right font-normal" title="Answers that cited the business being checked">Own cited</th>
          <th className="py-1 text-right font-normal" title="Answers that cited no business at all">No business</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.question.q} className="border-t border-border align-top">
            <td className="py-1.5 pr-2">
              <input type="checkbox" name="removeQ" value={s.question.q} aria-label={`Remove: ${s.question.q}`} />
            </td>
            <td className="py-1.5 pr-2">
              <span className="text-dark">{s.question.q}</span>{' '}
              <span className="text-xs text-text-secondary">{s.question.c}</span>
              {s.weak && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs text-amber-800">weak</span>}
            </td>
            <td className="py-1.5 pr-2 text-right">{s.asked}</td>
            <td className="py-1.5 pr-2 text-right">{percent(s.ownCited, s.answered)}</td>
            <td className="py-1.5 text-right">{percent(s.noBusinessCited, s.answered)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** The "learn from runs" suggestions for a live panel, applied together as one version. */
export function SuggestionsForm({
  slug,
  version,
  domains,
  questions,
}: {
  slug: string
  version: number
  domains: DomainSuggestion[]
  questions: QuestionStat[]
}) {
  const [state, action, pending] = useActionState<PanelFormState, FormData>(applyPanelSuggestions, {})
  const weak = questions.filter((q) => q.weak)
  const rest = questions.filter((q) => !q.weak)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="version" value={version} />

      <section>
        <h3 className="font-semibold text-dark">Domains cited for more than one business</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Not on this panel&apos;s lists, so reports treat them as rivals. A real competitor can stay; set it aside to stop
          seeing it here. Directories mark a business as &quot;renting&quot; its visibility; reference sites are never rivals.
        </p>
        {domains.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">None yet.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-text-secondary">
              <tr>
                <th className="py-1 pr-2 font-normal">Domain</th>
                <th className="py-1 pr-2 text-right font-normal">Businesses</th>
                <th className="py-1 pr-2 text-right font-normal">Citations</th>
                <th className="py-1 font-normal">Classify as</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.host} className="border-t border-border">
                  <td className="py-1.5 pr-2">
                    <a href={`https://${d.host}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {d.host}
                    </a>
                    {d.title && <p className="max-w-md truncate text-xs text-text-secondary">{d.title}</p>}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{d.businesses}</td>
                  <td className="py-1.5 pr-2 text-right">{d.citations}</td>
                  <td className="py-1.5">
                    <select name={`domain:${d.host}`} defaultValue="" className="rounded-md border border-border bg-white px-2 py-1 text-sm">
                      <option value="">Leave as rival</option>
                      <option value="directory">Directory</option>
                      <option value="reference">Reference</option>
                      <option value="dismiss">Set aside (competitor)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-dark">Questions</h3>
        <p className="mt-1 text-sm text-text-secondary">
          A weak question has been asked at least 3 times and at least 80% of its answers cited no business, so it
          can&apos;t show who is visible. Check any question to remove it.
        </p>
        {weak.length > 0 ? (
          <div className="mt-3">
            <QuestionRows stats={weak} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">No weak questions.</p>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-primary">All other questions ({rest.length})</summary>
          <div className="mt-2">
            <QuestionRows stats={rest} />
          </div>
        </details>
      </section>

      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <label htmlFor="note" className="mb-1 block text-sm font-medium text-dark">
            Note for the version history <span className="font-normal text-text-secondary">(optional)</span>
          </label>
          <input id="note" name="note" maxLength={500} className={inputClass} placeholder="Suggestions from runs" />
        </div>
        <FormStatus state={state} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'Saving…' : 'Apply selected changes'}
        </button>
      </div>
    </form>
  )
}

/** Rename a live panel; saved as a new version. */
export function RenameForm({ slug, version, name }: { slug: string; version: number; name: string }) {
  const [state, action, pending] = useActionState<PanelFormState, FormData>(renamePanel, {})
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="version" value={version} />
      <label htmlFor="rename" className="block text-sm font-medium text-dark">
        Name in the industry dropdown
      </label>
      <div className="flex flex-wrap gap-2">
        <input id="rename" name="name" required maxLength={100} defaultValue={name} className={`${inputClass} max-w-md`} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'Saving…' : 'Rename'}
        </button>
      </div>
      <FormStatus state={state} />
    </form>
  )
}

/** Ask Claude for a draft of a backlog panel. */
export function DraftForm({ slug, guidance, hasDraft }: { slug: string; guidance: string; hasDraft: boolean }) {
  const [state, action, pending] = useActionState<PanelFormState, FormData>(draftBacklogPanel, {})
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor="guidance" className="mb-1 block text-sm font-medium text-dark">
          Direction for Claude <span className="font-normal text-text-secondary">(optional)</span>
        </label>
        <textarea
          id="guidance"
          name="guidance"
          rows={3}
          maxLength={2000}
          defaultValue={guidance}
          className={inputClass}
          placeholder="For example: focus on commercial clients, include questions about emergency service, a sample business is example.com"
        />
      </div>
      <FormStatus state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Drafting… this takes a minute or two' : hasDraft ? 'Redraft with Claude' : 'Draft with Claude'}
      </button>
      {hasDraft && !pending && <p className="text-xs text-text-secondary">Redrafting replaces the current draft.</p>}
    </form>
  )
}

/** Review a draft: uncheck anything to leave out, then publish it as a live panel. */
export function PublishForm({
  slug,
  name,
  questions,
  directoryDomains,
  referenceDomains,
}: {
  slug: string
  name: string
  questions: PanelQuestion[]
  directoryDomains: string[]
  referenceDomains: string[]
}) {
  const [state, action, pending] = useActionState<PanelFormState, FormData>(publishBacklogDraft, {})
  const categories = [...new Set(questions.map((q) => q.c))]

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-dark">
          Name in the industry dropdown
        </label>
        <input id="name" name="name" required maxLength={100} defaultValue={name} className={inputClass} />
      </div>

      <section className="space-y-4">
        <h3 className="font-semibold text-dark">Questions ({questions.length})</h3>
        {categories.map((category) => (
          <div key={category}>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{category}</p>
            <ul className="mt-1 space-y-1">
              {questions.map((q, i) =>
                q.c === category ? (
                  <li key={i}>
                    <label className="flex items-start gap-2 text-sm text-dark">
                      <input type="checkbox" name="keepQ" value={i} defaultChecked className="mt-1" />
                      <span>{q.q}</span>
                    </label>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        ))}
      </section>

      {[
        { label: 'Directory domains', field: 'keepDir', list: directoryDomains },
        { label: 'Reference domains', field: 'keepRef', list: referenceDomains },
      ].map(({ label, field, list }) => (
        <section key={field}>
          <h3 className="font-semibold text-dark">
            {label} ({list.length})
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {list.map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-sm text-dark">
                <input type="checkbox" name={field} value={d} defaultChecked />
                {d}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="space-y-3 border-t border-border pt-4">
        <FormStatus state={state} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'Publishing…' : 'Publish as a live panel'}
        </button>
        <p className="text-xs text-text-secondary">
          Publishing adds it to the snapshot form&apos;s industry list right away, as version 1.
        </p>
      </div>
    </form>
  )
}
