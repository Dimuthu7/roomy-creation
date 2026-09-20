'use client'
import { formatCents } from '@/lib/money'
import { deletePayment } from './actions'

const KIND_LABELS: Record<string, string> = { advance: 'Advance', final: 'Final', other: 'Other' }

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
  )
}
