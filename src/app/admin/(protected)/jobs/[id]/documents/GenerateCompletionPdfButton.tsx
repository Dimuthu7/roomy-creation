'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { generateCompletionDocument, type ActionState } from './actions'

const initialState: ActionState = {}

export function GenerateCompletionPdfButton({ jobId }: { jobId: string }) {
  const [state, formAction] = useActionState(generateCompletionDocument, initialState)

  useEffect(() => {
    if (state.success) toast.success('Completion certificate generated.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <AdminSubmitButton
        label="Generate completion certificate"
        pendingLabel="Generating"
        className="rounded-full border border-navy bg-navy px-4 py-2 font-display text-sm text-paper transition duration-200 hover:bg-navy/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
