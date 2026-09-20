'use client'
import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { recordPayment, type ActionState } from './actions'

const initialState: ActionState = {}
const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Free-text `method` with suggestions rather than a fixed dropdown — payments.method
 *  has no enum in the schema (see schema.ts's comment on the jobs.salesPerson
 *  precedent this follows), so a <datalist> offers common values without forcing them. */
export function PaymentForm({ jobId, stage }: { jobId: string; stage: string }) {
  const [state, formAction] = useActionState(recordPayment, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      toast.success(
        stage === 'quotation'
          ? 'Payment recorded. This quotation now has a payment — confirm it as an order from the job page when ready.'
          : 'Payment recorded.',
      )
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, stage])

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 border-2 border-navy p-4 sm:grid-cols-2">
      <input type="hidden" name="jobId" value={jobId} />
      <div>
        <label htmlFor="kind" className={LABEL}>
          Kind
        </label>
        <select id="kind" name="kind" defaultValue="advance" className={FIELD}>
          <option value="advance">Advance</option>
          <option value="final">Final</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="amount" className={LABEL}>
          Amount
        </label>
        <input id="amount" name="amount" inputMode="decimal" placeholder="150,000.00" required className={FIELD} />
      </div>
      <div>
        <label htmlFor="paidAt" className={LABEL}>
          Date paid
        </label>
        <input id="paidAt" name="paidAt" type="date" defaultValue={today()} required className={FIELD} />
      </div>
      <div>
        <label htmlFor="method" className={LABEL}>
          Method (optional)
        </label>
        <input id="method" name="method" list="payment-methods" className={FIELD} />
        <datalist id="payment-methods">
          <option value="Cash" />
          <option value="Bank transfer" />
          <option value="Cheque" />
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="note" className={LABEL}>
          Note (optional)
        </label>
        <input id="note" name="note" className={FIELD} />
      </div>
      <div className="sm:col-span-2">
        <AdminSubmitButton
          label="Record payment"
          pendingLabel="Recording"
          className="rounded-full bg-yellow px-6 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
        />
      </div>
    </form>
  )
}
