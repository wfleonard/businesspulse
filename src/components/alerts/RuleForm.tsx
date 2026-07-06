'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { createRuleAction, type AlertsFormState } from '@/app/dashboard/alerts/actions'

const initial: AlertsFormState = { ok: false }

const CONDITIONS: { value: string; label: string; needsThreshold: boolean }[] = [
  { value: 'pct_drop', label: 'Drops by ≥ X%', needsThreshold: true },
  { value: 'pct_rise', label: 'Rises by ≥ X%', needsThreshold: true },
  { value: 'below_target', label: 'Falls below its target', needsThreshold: false },
  { value: 'above_target', label: 'Rises above its target', needsThreshold: false },
  { value: 'below_threshold', label: 'Falls below a value X', needsThreshold: true },
  { value: 'above_threshold', label: 'Rises above a value X', needsThreshold: true },
]

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function RuleForm({ metricKeys }: { metricKeys: string[] }) {
  const [state, action, pending] = useActionState(createRuleAction, initial)

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Metric</span>
          <input name="metricKey" list="rule-metric-keys" required placeholder="monthly_revenue" className={inputCls} />
          <datalist id="rule-metric-keys">
            {metricKeys.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Condition</span>
          <select name="condition" defaultValue="pct_drop" className={inputCls}>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Threshold (X)</span>
          <input name="threshold" type="number" step="any" placeholder="10" className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add rule'}
        </Button>
        {state.message && (
          <span className={state.ok ? 'text-sm text-success' : 'text-sm text-danger'}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  )
}
