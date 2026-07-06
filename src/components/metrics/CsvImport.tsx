'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { importCsvAction, type FormState } from '@/app/dashboard/metrics/actions'

const initial: FormState = { ok: false }

export function CsvImport() {
  const [state, action, pending] = useActionState(importCsvAction, initial)

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-text-secondary">
        Columns: <code>metric_key, period_start, period_end, value</code> (plus optional{' '}
        <code>dimension:name</code> columns). Dates as <code>YYYY-MM-DD</code>.
      </p>
      <input
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import CSV'}
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
