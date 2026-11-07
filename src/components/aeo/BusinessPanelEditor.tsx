'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

type Question = { c: string; q: string; offering: string; why: string; origin: 'library' | 'new' | 'admin' }

type Props = {
  businessId: string
  panelId: string
  status: string
  questions: Question[]
  directoryDomains: string[]
  referenceDomains: string[]
  note: string
  categories: { value: string; label: string }[]
  offerings: string[]
  costPerQuestion: number
  action: (formData: FormData) => Promise<void>
}

const inputClass = 'w-full rounded-md border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

/**
 * The admin's review of a business panel: edit, drop, or add questions, adjust
 * the domain lists, then save or approve. Sends the whole panel as JSON; the
 * server action validates it again.
 */
export function BusinessPanelEditor(props: Props) {
  const [questions, setQuestions] = useState<(Question & { key: number; drop: boolean })[]>(() =>
    props.questions.map((q, key) => ({ ...q, key, drop: false }))
  )
  const [nextKey, setNextKey] = useState(props.questions.length)
  const [directory, setDirectory] = useState(props.directoryDomains.join('\n'))
  const [reference, setReference] = useState(props.referenceDomains.join('\n'))
  const [note, setNote] = useState(props.note)
  const [filter, setFilter] = useState('')

  const kept = questions.filter((q) => !q.drop && q.q.trim())
  const estimate = (kept.length * props.costPerQuestion).toFixed(2)
  const byCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const q of kept) counts.set(q.c, (counts.get(q.c) ?? 0) + 1)
    return counts
  }, [kept])

  const payload = JSON.stringify({
    questions: kept.map(({ c, q, offering, why, origin }) => ({ c, q: q.trim(), offering, why, origin })),
    directoryDomains: directory,
    referenceDomains: reference,
    note,
  })

  const update = (key: number, change: Partial<Question & { drop: boolean }>) =>
    setQuestions((list) => list.map((q) => (q.key === key ? { ...q, ...change } : q)))

  const shown = filter ? questions.filter((q) => q.c === filter || q.offering === filter) : questions
  const label = (value: string) => props.categories.find((c) => c.value === value)?.label ?? value

  return (
    <form action={props.action} className="space-y-6">
      <input type="hidden" name="businessId" value={props.businessId} />
      <input type="hidden" name="panelId" value={props.panelId} />
      <input type="hidden" name="payload" value={payload} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="font-medium text-dark">
          {kept.length} questions · estimated run cost ${estimate}
        </span>
        <label className="flex items-center gap-2 text-text-secondary">
          Show
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border border-border px-2 py-1">
            <option value="">All</option>
            <optgroup label="Type">
              {props.categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({byCategory.get(c.value) ?? 0})
                </option>
              ))}
            </optgroup>
            <optgroup label="Offering">
              {[...props.offerings, 'general'].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <ol className="space-y-3">
        {shown.map((q) => (
          <li key={q.key} className={cn('rounded-md border border-border p-3', q.drop && 'bg-gray-50 opacity-60')}>
            <div className="flex flex-wrap items-start gap-2">
              <select
                aria-label="Question type"
                value={q.c}
                onChange={(e) => update(q.key, { c: e.target.value })}
                className="rounded-md border border-border px-2 py-1 text-xs"
              >
                {props.categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                aria-label="Question"
                value={q.q}
                onChange={(e) => update(q.key, { q: e.target.value, origin: 'admin' })}
                className={cn(inputClass, 'min-w-0 flex-1', q.drop && 'line-through')}
              />
              <label className="flex items-center gap-1 text-xs text-text-secondary">
                <input type="checkbox" checked={q.drop} onChange={(e) => update(q.key, { drop: e.target.checked })} />
                Drop
              </label>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              <span className="font-medium">{q.offering}</span>
              {q.why && ` · ${q.why}`} · {q.origin === 'library' ? 'from the industry panel' : q.origin === 'new' ? 'written for this business' : 'edited by you'}
            </p>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => {
          setQuestions((list) => [
            ...list,
            { key: nextKey, c: filter && props.categories.some((c) => c.value === filter) ? filter : 'service-geo', q: '', offering: 'general', why: '', origin: 'admin', drop: false },
          ])
          setNextKey((k) => k + 1)
        }}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-dark hover:bg-gray-50"
      >
        Add a question{filter && props.categories.some((c) => c.value === filter) ? ` (${label(filter)})` : ''}
      </button>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-dark">Directories and marketplaces</span>
          <span className="block text-xs text-text-secondary">Cited instead of the business: &quot;renting&quot; the answer.</span>
          <textarea value={directory} onChange={(e) => setDirectory(e.target.value)} rows={6} className={cn(inputClass, 'mt-1')} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-dark">Reference sites</span>
          <span className="block text-xs text-text-secondary">Cited but not competitors: authorities, encyclopedias.</span>
          <textarea value={reference} onChange={(e) => setReference(e.target.value)} rows={6} className={cn(inputClass, 'mt-1')} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-dark">Note on this version (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={cn(inputClass, 'mt-1')} />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="save"
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50"
        >
          {props.status === 'approved' ? 'Save as a new draft' : 'Save draft'}
        </button>
        <button
          type="submit"
          name="intent"
          value="approve"
          onClick={(e) => {
            if (!window.confirm(`Approve ${kept.length} questions? Pulse runs for this business will ask this panel.`)) e.preventDefault()
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          {props.status === 'approved' ? 'Save and approve as a new version' : 'Approve'}
        </button>
      </div>
    </form>
  )
}
