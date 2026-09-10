'use client'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import { deleteClause, moveClause, toggleClauseActive, updateClause, type ActionState } from './actions'

export interface ClauseRowData {
  id: string
  kind: string
  body: string
  emphasis: boolean
  active: boolean
}

const initialState: ActionState = {}
const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'

export function ClauseRow({ clause, isFirst, isLast }: { clause: ClauseRowData; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(updateClause, initialState)

  // Toast only, no auto-close: closing on success would be a setState call inside
  // this effect, which cascades an extra render for no benefit here — the admin
  // clicks Done when finished, same as every other open/close toggle in this admin
  // portal (see ManualTestimonialForm, which also never auto-closes on success).
  useEffect(() => {
    if (state.success) {
      toast.success('Clause updated.')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  if (editing) {
    return (
      <form action={formAction} className="space-y-3 border-2 border-navy p-4">
        <input type="hidden" name="id" value={clause.id} />
        <input type="hidden" name="kind" value={clause.kind} />
        <textarea name="body" required rows={2} defaultValue={clause.body} className={FIELD} />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="emphasis" defaultChecked={clause.emphasis} className="size-4 accent-navy" />
          <span className="u-mono text-sm">Bold on the document</span>
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-yellow px-4 py-1.5 font-display text-xs text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
          >
            <SubmitButtonLabel pending={pending} label="Save" pendingLabel="Saving" spinnerSize={12} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="u-mono text-xs text-navy underline underline-offset-4 hover:text-navy/70"
          >
            Done
          </button>
        </div>
      </form>
    )
  }

  return (
    <div
      data-testid="clause-row"
      className={`flex flex-wrap items-start justify-between gap-4 border-2 border-navy p-4 ${clause.active ? '' : 'opacity-50'}`}
    >
      <p className={`min-w-0 flex-1 text-sm text-navy ${clause.emphasis ? 'font-bold' : ''}`}>{clause.body}</p>

      <div className="flex shrink-0 items-center gap-2">
        <form action={moveClause}>
          <input type="hidden" name="id" value={clause.id} />
          <input type="hidden" name="direction" value="up" />
          <AdminSubmitButton
            label="↑"
            pendingLabel=""
            disabled={isFirst}
            ariaLabel="Move up"
            spinnerSize={12}
            className="h-8 w-8 rounded-full border border-navy text-navy disabled:opacity-30"
          />
        </form>
        <form action={moveClause}>
          <input type="hidden" name="id" value={clause.id} />
          <input type="hidden" name="direction" value="down" />
          <AdminSubmitButton
            label="↓"
            pendingLabel=""
            disabled={isLast}
            ariaLabel="Move down"
            spinnerSize={12}
            className="h-8 w-8 rounded-full border border-navy text-navy disabled:opacity-30"
          />
        </form>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border border-navy px-3 py-1.5 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95"
        >
          Edit
        </button>

        <form action={toggleClauseActive}>
          <input type="hidden" name="id" value={clause.id} />
          <AdminSubmitButton
            label={clause.active ? 'Deactivate' : 'Activate'}
            pendingLabel={clause.active ? 'Deactivating' : 'Activating'}
            spinnerSize={12}
            className="rounded-full border border-navy px-3 py-1.5 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-60"
          />
        </form>

        <form action={deleteClause}>
          <input type="hidden" name="id" value={clause.id} />
          <AdminSubmitButton
            label="Delete"
            pendingLabel="Deleting"
            ariaLabel="Delete"
            spinnerSize={12}
            className="rounded-full border border-navy px-3 py-1.5 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-60"
          />
        </form>
      </div>
    </div>
  )
}
