'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import { syncFacebookReviews, type SyncActionState } from './actions'

const initialState: SyncActionState = {}

export function SyncFacebookButton() {
  const [state, formAction, pending] = useActionState(syncFacebookReviews, initialState)

  useEffect(() => {
    if (state.summary) toast.success(`Facebook sync complete: ${state.summary}`)
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-yellow px-5 py-2.5 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      >
        <SubmitButtonLabel pending={pending} label="Sync from Facebook" pendingLabel="Syncing" />
      </button>
    </form>
  )
}
