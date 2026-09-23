'use client'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { formatCents } from '@/lib/money'
import { completeJob } from '../actions'

/** The balance shapes the confirm message and nothing else — `completeJob` never reads
 *  it, so a client that skipped this dialog still completes the job. That is correct:
 *  the warning is an aid to the admin, not an invariant.
 *
 *  An overpayment is called out separately rather than folded into "paid in full", for
 *  the same reason paymentPosition refuses to clamp its balance at zero: it is a real
 *  bookkeeping problem, and completion is the last good moment to notice it. */
function confirmMessage(balanceCents: number): string {
  if (balanceCents > 0) {
    return `There is a pending payment of LKR ${formatCents(balanceCents)} on this order. Complete it anyway?`
  }
  if (balanceCents < 0) {
    return `This order is overpaid by LKR ${formatCents(-balanceCents)}. Complete it anyway?`
  }
  return 'Complete this order? You can then issue the completion certificate.'
}

export function CompleteOrderButton({
  jobId,
  balanceCents,
  completedAt,
}: {
  jobId: string
  /** Null when a unit is still unresolved, so no total exists — the job cannot be
   *  completed and the button is not offered. */
  balanceCents: number | null
  /** ISO string, or null while the job is not finished. */
  completedAt: string | null
}) {
  if (completedAt !== null) {
    return (
      <p className="u-mono text-xs text-navy/60">Completed on {new Date(completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
    )
  }

  if (balanceCents === null) return null

  return (
    <form
      action={completeJob}
      onSubmit={(e) => {
        if (!confirm(confirmMessage(balanceCents))) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={jobId} />
      <AdminSubmitButton
        label="Complete order"
        pendingLabel="Completing"
        className="rounded-full border border-navy bg-navy px-4 py-2 font-display text-sm text-paper transition duration-200 hover:bg-navy/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
