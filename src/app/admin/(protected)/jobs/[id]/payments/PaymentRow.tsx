'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { deletePayment, generateReceipt, type ActionState } from './actions'
import { formatCents } from '@/lib/money'

const initialState: ActionState = {}
const KIND_LABELS: Record<string, string> = { advance: 'Advance', final: 'Final', other: 'Other' }

function GenerateReceiptButton({ jobId, paymentId }: { jobId: string; paymentId: string }) {
  const [state, formAction] = useActionState(generateReceipt, initialState)

  useEffect(() => {
    if (state.success) toast.success('Receipt generated — find it on the Documents page.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <AdminSubmitButton
        label="Generate receipt"
        pendingLabel="Generating"
        className="rounded-full border border-navy px-4 py-2 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}

export function PaymentRow({
  id,
  jobId,
  kind,
  amountCents,
  paidAt,
  method,
  note,
}: {
  id: string
  jobId: string
  kind: string
  amountCents: number
  paidAt: string
  method: string | null
  note: string | null
}) {
  return (
    <div data-testid="payment-row" className="flex flex-wrap items-center justify-between gap-4 border border-navy/40 p-4">
      <div>
        <p className="font-display text-navy">
          {formatCents(amountCents)} <span className="u-mono text-xs text-navy/60">({KIND_LABELS[kind] ?? kind})</span>
        </p>
        <p className="u-mono mt-1 text-xs text-navy/60">
          {paidAt}
          {method ? ` · ${method}` : ''}
          {note ? ` · ${note}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <GenerateReceiptButton jobId={jobId} paymentId={id} />
        <form
          action={deletePayment}
          onSubmit={(e) => {
            if (!confirm('Delete this payment?')) e.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="jobId" value={jobId} />
          <button type="submit" className="u-mono text-xs text-navy/60 underline">
            Delete
          </button>
        </form>
      </div>
    </div>
  )
}
