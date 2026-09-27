'use client'
import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import { addClause, type ActionState } from './actions'
import type { CLAUSE_KINDS } from '@/lib/jobs/schema'

const initialState: ActionState = {}
const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'

export function ClauseForm({ kind }: { kind: (typeof CLAUSE_KINDS)[number] }) {
  const [state, formAction, pending] = useActionState(addClause, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      toast.success('Clause added.')
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-3 border-2 border-navy p-4">
      <input type="hidden" name="kind" value={kind} />
      <div>
        <label htmlFor={`${kind}-body`} className={LABEL}>
          Clause text
        </label>
        <textarea id={`${kind}-body`} name="body" required rows={2} className={FIELD} />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="emphasis" className="size-4 accent-navy" />
        <span className="u-mono text-sm">Bold on the document</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      >
        <SubmitButtonLabel pending={pending} label="Add clause" pendingLabel="Adding" spinnerSize={14} />
      </button>
    </form>
  )
}
