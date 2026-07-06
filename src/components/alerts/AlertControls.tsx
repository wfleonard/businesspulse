'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  setAlertStatusAction,
  deleteRuleAction,
  runWatchNowAction,
  type AlertsFormState,
} from '@/app/dashboard/alerts/actions'

const initial: AlertsFormState = { ok: false }

export function RunWatchButton() {
  const [state, action, pending] = useActionState(runWatchNowAction, initial)
  return (
    <form action={action} className="flex items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? 'Running…' : 'Run watch now'}
      </Button>
      {state.message && <span className="text-sm text-text-secondary">{state.message}</span>}
    </form>
  )
}

export function AlertControls({ id, status }: { id: string; status: string }) {
  const [, action, pending] = useActionState(setAlertStatusAction, initial)
  return (
    <div className="flex items-center gap-2">
      {status === 'open' && (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="acknowledged" />
          <Button type="submit" variant="ghost" className="px-2 py-1 text-xs" disabled={pending}>
            Acknowledge
          </Button>
        </form>
      )}
      {status !== 'resolved' && (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="resolved" />
          <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-success" disabled={pending}>
            Resolve
          </Button>
        </form>
      )}
    </div>
  )
}

export function RuleDelete({ id }: { id: string }) {
  const [, action, pending] = useActionState(deleteRuleAction, initial)
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-danger" disabled={pending}>
        Delete
      </Button>
    </form>
  )
}
