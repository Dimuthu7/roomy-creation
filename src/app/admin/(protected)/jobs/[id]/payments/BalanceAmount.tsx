import { formatCents } from '@/lib/money'

/** Balance is total minus paid: positive means still owed, zero means settled, and
 *  negative means the customer paid more than the total (see paymentPosition). Each
 *  state gets its own pill so "paid in full" and "overpaid" read as states, not just
 *  numbers landing on or past zero. */
export function BalanceAmount({ balanceCents }: { balanceCents: number }) {
  if (balanceCents === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-navy bg-teal px-3 py-1 font-bold text-paper">
        Paid in full
      </span>
    )
  }

  if (balanceCents < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-navy/40 px-3 py-1 text-navy/60">
        Overpaid by {formatCents(-balanceCents)}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-navy bg-yellow px-3 py-1 font-bold text-navy">
      {formatCents(balanceCents)}
    </span>
  )
}
