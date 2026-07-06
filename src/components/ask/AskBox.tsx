'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { askAction, type AskState } from '@/app/dashboard/ask/actions'

const initial: AskState = { status: 'idle' }

const EXAMPLES = [
  'What should I pay attention to this month?',
  'Which metrics are below target?',
  'Why did my numbers change vs last period?',
  "What's my biggest risk right now?",
]

const confidenceClass = {
  high: 'bg-success/10 text-success',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-gray-100 text-text-secondary',
} as const

export function AskBox() {
  const [state, action, pending] = useActionState(askAction, initial)
  const [question, setQuestion] = useState('')

  return (
    <div className="space-y-6">
      <Card>
        <form action={action} className="space-y-3">
          <label htmlFor="question" className="flex items-center gap-2 text-sm font-medium text-dark">
            <Sparkles size={16} className="text-primary" />
            Ask anything about your business
          </label>
          <textarea
            id="question"
            name="question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What changed this month and what should I do about it?"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:bg-gray-50"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending || question.trim().length < 3}>
              {pending ? 'Thinking…' : 'Ask'}
            </Button>
            {state.status === 'error' && (
              <span className="text-sm text-danger">{state.message}</span>
            )}
          </div>
        </form>
      </Card>

      {state.status === 'ok' && state.result && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-text-secondary">{state.question}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${confidenceClass[state.result.confidence]}`}
            >
              {state.result.confidence} confidence
            </span>
          </div>

          <p className="text-dark">{state.result.answer}</p>

          {state.result.drivers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                What&apos;s driving it
              </h3>
              <ul className="mt-1 list-inside list-disc text-sm text-dark">
                {state.result.drivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {state.result.suggestedActions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Suggested next steps
              </h3>
              <ul className="mt-1 list-inside list-disc text-sm text-dark">
                {state.result.suggestedActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {state.result.refs.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <span className="text-xs text-text-secondary">Based on: </span>
              {state.result.refs.map((r) => (
                <Link
                  key={r.key}
                  href={`/dashboard/metrics/${r.key}`}
                  className="mr-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  {r.label}
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
