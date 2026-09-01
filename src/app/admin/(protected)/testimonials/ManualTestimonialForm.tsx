'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import { addManualTestimonial, type ActionState } from './actions'

const initialState: ActionState = {}
const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'

export function ManualTestimonialForm() {
  const [state, formAction, pending] = useActionState(addManualTestimonial, initialState)
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      toast.success('Testimonial added.')
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="u-mono text-sm text-navy underline underline-offset-4 hover:text-navy/70"
      >
        + Add testimonial manually
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 border-2 border-navy p-4"
      data-testid="manual-testimonial-form"
    >
      <div>
        <label htmlFor="authorName" className={LABEL}>
          Name
        </label>
        <input id="authorName" name="authorName" required className={FIELD} />
      </div>
      <div>
        <label htmlFor="reviewText" className={LABEL}>
          Review text
        </label>
        <textarea id="reviewText" name="reviewText" required rows={3} className={FIELD} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rating" className={LABEL}>
            Rating (1-5, optional)
          </label>
          <input
            id="rating"
            name="rating"
            type="number"
            min={1}
            max={5}
            defaultValue=""
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="recommended" className={LABEL}>
            Recommended (optional)
          </label>
          <select id="recommended" name="recommended" defaultValue="" className={FIELD}>
            <option value="">Not set</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
        >
          <SubmitButtonLabel pending={pending} label="Add testimonial" pendingLabel="Adding" spinnerSize={14} />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="u-mono text-sm text-navy underline underline-offset-4 hover:text-navy/70"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
