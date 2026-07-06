'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { recordValueAction, type FormState } from '@/app/dashboard/metrics/actions'

const initial: FormState = { ok: false }

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function ValueForm({ metricKeys }: { metricKeys: string[] }) {
  const [state, action, pending] = useActionState(recordValueAction, initial)

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Metric</span>
          <input
            name="metricKey"
            list="metric-keys"
            placeholder="monthly_revenue"
            required
            className={inputCls}
          />
          <datalist id="metric-keys">
            {metricKeys.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          {state.fieldErrors?.metricKey && (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.metricKey}
            </span>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Value</span>
          <input name="value" type="number" step="any" required className={inputCls} />
          {state.fieldErrors?.value && (
            <span className="mt-1 block text-xs text-danger">{state.fieldErrors.value}</span>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Period start</span>
          <input name="periodStart" type="date" required className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Period end</span>
          <input name="periodEnd" type="date" required className={inputCls} />
          {state.fieldErrors?.periodEnd && (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.periodEnd}
            </span>
          )}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Recording…' : 'Record value'}
        </Button>
        {state.ok && state.message && (
          <span className="text-sm text-success">{state.message}</span>
        )}
      </div>
    </form>
  )
}
