'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { createSourceAction, type SourceFormState } from '@/app/dashboard/sources/actions'

const initial: SourceFormState = { ok: false }

const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3400'

const EXAMPLE = JSON.stringify(
  {
    baseUrl: base,
    auth: { type: 'none' },
    endpoints: [
      {
        path: '/api/dev/mock-metrics',
        rowsPath: 'data',
        mappings: [
          {
            metricKey: 'website_leads',
            valuePath: 'leads',
            periodStartPath: 'month_start',
            periodEndPath: 'month_end',
          },
          {
            metricKey: 'ad_spend',
            valuePath: 'ad_spend',
            periodStartPath: 'month_start',
            periodEndPath: 'month_end',
          },
        ],
      },
    ],
  },
  null,
  2
)

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function AddSourceForm() {
  const [state, action, pending] = useActionState(createSourceAction, initial)

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">Source name</span>
        <input name="name" placeholder="Marketing API" required className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">Connector config (JSON)</span>
        <textarea
          name="config"
          rows={16}
          defaultValue={EXAMPLE}
          spellCheck={false}
          className={`${inputCls} font-mono text-xs`}
        />
      </label>
      <p className="text-xs text-text-secondary">
        <code>auth.type</code>: <code>none</code> · <code>apiKey</code> (header, key) ·{' '}
        <code>bearer</code> (token) · <code>basic</code> (username, password). Each mapping
        pulls one metric from each row via <code>valuePath</code> /{' '}
        <code>periodStartPath</code>. Secrets are encrypted at rest.
      </p>
      {state.errors && state.errors.length > 0 && (
        <ul className="list-inside list-disc text-sm text-danger">
          {state.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Create source'}
        </Button>
        {state.ok && state.message && (
          <span className="text-sm text-success">{state.message}</span>
        )}
      </div>
    </form>
  )
}
