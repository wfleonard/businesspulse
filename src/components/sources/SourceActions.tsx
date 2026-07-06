'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  syncSourceAction,
  deleteSourceAction,
  type SourceFormState,
} from '@/app/dashboard/sources/actions'

const initial: SourceFormState = { ok: false }

export function SourceActions({ id }: { id: string }) {
  const [syncState, sync, syncing] = useActionState(syncSourceAction, initial)
  const [, del, deleting] = useActionState(deleteSourceAction, initial)

  return (
    <div className="flex items-center gap-3">
      <form action={sync}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="secondary" className="px-3 py-1" disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </form>
      <form action={del}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" className="px-2 py-1 text-danger" disabled={deleting}>
          Delete
        </Button>
      </form>
      {syncState.message && (
        <span className={syncState.ok ? 'text-xs text-success' : 'text-xs text-danger'}>
          {syncState.message}
        </span>
      )}
    </div>
  )
}
