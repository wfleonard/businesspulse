'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { createSourceAction, type SourceFormState } from '@/app/dashboard/sources/actions'

const initial: SourceFormState = { ok: false }

// A neutral, production-safe example template showing per-row + aggregate
// (count/sum) mappings and a row filter. Replace with your real API.
const EXAMPLE = JSON.stringify(
  {
    baseUrl: 'https://api.example.com',
    auth: { type: 'bearer', token: 'YOUR_TOKEN' },
    endpoints: [
      {
        path: '/v1/orders',
        query: { limit: '1000' },
        filter: [{ path: 'status', equals: 'completed' }],
        mappings: [
          {
            metricKey: 'orders_count',
            aggregate: 'count',
            periodStartPath: 'created_at',
            periodGranularity: 'month',
          },
          {
            metricKey: 'order_revenue',
            aggregate: 'sum',
            valuePath: 'total',
            periodStartPath: 'created_at',
            periodGranularity: 'month',
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
        <code>bearer</code> (token) · <code>basic</code> (username, password). A mapping either
        reads one value per row (<code>valuePath</code>) or aggregates rows into periods
        (<code>aggregate</code>: <code>count</code>/<code>sum</code> +{' '}
        <code>periodGranularity</code>). Optional <code>filter</code> keeps only matching rows.
        Add multiple <code>endpoints</code> for one API. Secrets are encrypted at rest.
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
