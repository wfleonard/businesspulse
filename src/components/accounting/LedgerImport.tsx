'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  importAccountsAction,
  importTransactionsAction,
  type ImportState,
} from '@/app/dashboard/accounting/actions'

const initial: ImportState = { ok: false }

const fileInputCls =
  'block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90'

export function AccountsImport() {
  const [state, action, pending] = useActionState(importAccountsAction, initial)
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-text-secondary">
        Columns: <code>name, type</code> (plus optional <code>subtype</code>, <code>code</code>).
        Type accepts QuickBooks/Wave labels — Income, Expense, Cost of Goods Sold, Bank, Accounts
        Receivable, Credit Card, Equity, …
      </p>
      <input name="file" type="file" accept=".csv,text/csv" required className={fileInputCls} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import accounts'}
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

export function TransactionsImport() {
  const [state, action, pending] = useActionState(importTransactionsAction, initial)
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-text-secondary">
        Columns: <code>date, account</code> and either <code>amount</code> (natural sign) or{' '}
        <code>debit</code> + <code>credit</code>; plus optional <code>description</code> and a party
        column (<code>vendor</code>/<code>customer</code>/<code>name</code>). Import accounts first.
      </p>
      <input name="file" type="file" accept=".csv,text/csv" required className={fileInputCls} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import transactions'}
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
