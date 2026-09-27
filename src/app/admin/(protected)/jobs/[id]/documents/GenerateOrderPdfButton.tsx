'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { generateOrderDocument, type ActionState } from './actions'

const initialState: ActionState = {}

export function GenerateOrderPdfButton({ jobId }: { jobId: string }) {
  const [state, formAction] = useActionState(generateOrderDocument, initialState)

  useEffect(() => {
    if (state.success) toast.success('Order document generated.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <AdminSubmitButton
        label="Generate order document"
        pendingLabel="Generating"
        className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
