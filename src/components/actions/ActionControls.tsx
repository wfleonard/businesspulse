'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  generateRecommendationsAction,
  setRecommendationStatusAction,
  type ActionsState,
} from '@/app/dashboard/actions/actions'

const initial: ActionsState = { ok: false }

export function GenerateButton() {
  const [state, action, pending] = useActionState(generateRecommendationsAction, initial)
  return (
    <form action={action} className="flex items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? 'Thinking…' : 'Suggest actions'}
      </Button>
      {state.message && (
        <span className={state.ok ? 'text-sm text-text-secondary' : 'text-sm text-danger'}>
          {state.message}
        </span>
      )}
    </form>
  )
}

export function RecommendationControls({ id, status }: { id: string; status: string }) {
  const [, action, pending] = useActionState(setRecommendationStatusAction, initial)
  const btn = (value: string, label: string, cls: string) => (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={value} />
      <Button type="submit" variant="ghost" className={`px-2 py-1 text-xs ${cls}`} disabled={pending}>
        {label}
      </Button>
    </form>
  )

  return (
    <div className="flex items-center gap-1">
      {status === 'suggested' && btn('accepted', 'Accept', 'text-primary')}
      {(status === 'suggested' || status === 'accepted') && btn('done', 'Done', 'text-success')}
      {status !== 'dismissed' && status !== 'done' && btn('dismissed', 'Dismiss', 'text-danger')}
    </div>
  )
}
