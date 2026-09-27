'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { createJob, type ActionState } from './actions'

const initialState: ActionState = {}
const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Collects only the customer's details plus the quotation date — everything else
 *  (units, money, clauses) is added on the edit screen createJob redirects to. On
 *  success createJob redirects itself (see its doc comment), so there is no
 *  success-state branch here, only an error one — same shape as the admin login form. */
export function NewJobForm() {
  const [state, formAction] = useActionState(createJob, initialState)

  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} className="max-w-lg space-y-4 border-2 border-navy p-6">
      <div>
        <label htmlFor="name" className={LABEL}>
          Customer name
        </label>
        <input id="name" name="name" required className={FIELD} />
      </div>

      <div>
        <label htmlFor="phone" className={LABEL}>
          Phone
        </label>
        <input id="phone" name="phone" required className={FIELD} />
      </div>

      <div>
        <label htmlFor="email" className={LABEL}>
          Email (optional)
        </label>
        <input id="email" name="email" type="email" className={FIELD} />
      </div>

      <div>
        <label htmlFor="addressLines" className={LABEL}>
          Address (optional, one line at a time)
        </label>
        <textarea id="addressLines" name="addressLines" rows={2} className={FIELD} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className={LABEL}>
            City (optional)
          </label>
          <input id="city" name="city" className={FIELD} />
        </div>
        <div>
          <label htmlFor="district" className={LABEL}>
            District (optional)
          </label>
          <input id="district" name="district" className={FIELD} />
        </div>
      </div>

      <div>
        <label htmlFor="quotationDate" className={LABEL}>
          Quotation date
        </label>
        <input
          id="quotationDate"
          name="quotationDate"
          type="date"
          required
          defaultValue={today()}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="notes" className={LABEL}>
          Notes (optional)
        </label>
        <textarea id="notes" name="notes" rows={2} className={FIELD} />
      </div>

      <AdminSubmitButton
        label="Create quotation"
        pendingLabel="Creating"
        className="rounded-full bg-yellow px-6 py-3 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
