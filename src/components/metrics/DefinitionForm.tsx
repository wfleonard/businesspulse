'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { createDefinitionAction, type FormState } from '@/app/dashboard/metrics/actions'

const initial: FormState = { ok: false }

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function DefinitionForm() {
  const [state, action, pending] = useActionState(createDefinitionAction, initial)

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Key</span>
          <input name="key" placeholder="monthly_revenue" required className={inputCls} />
          {state.fieldErrors?.key && (
            <span className="mt-1 block text-xs text-danger">{state.fieldErrors.key}</span>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Label</span>
          <input name="label" placeholder="Monthly Revenue" required className={inputCls} />
          {state.fieldErrors?.label && (
            <span className="mt-1 block text-xs text-danger">{state.fieldErrors.label}</span>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Unit</span>
          <input name="unit" placeholder="$, %, jobs…" className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Category</span>
          <input name="category" placeholder="Revenue" className={inputCls} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Direction</span>
          <select name="direction" defaultValue="up_good" className={inputCls}>
            <option value="up_good">Higher is better</option>
            <option value="down_good">Lower is better</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-dark">Target (optional)</span>
          <input name="target" type="number" step="any" className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save metric'}
        </Button>
        {state.ok && state.message && (
          <span className="text-sm text-success">{state.message}</span>
        )}
      </div>
    </form>
  )
}
