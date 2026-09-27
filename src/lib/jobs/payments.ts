// Pure money logic over a job's payments — the Slice 2 counterpart to totals.ts.
// Composes with jobTotals the same way jobTotals composes with resolvedOption: each
// stage refuses to produce a number until its input is complete.

export interface Payment {
  amountCents: number
}

export interface PaymentPosition {
  paidCents: number
  balanceCents: number
}

export function paidTotalCents(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amountCents, 0)
}

/** Null whenever the job itself has no total yet (jobTotals returned null because a
 *  unit is still unresolved) — a balance can never be computed or printed against a
 *  price that isn't settled. Not clamped to zero: an overpayment is a real balance a
 *  refund would need to correct, and hiding it would hide a bookkeeping problem. */
export function paymentPosition(totalCents: number | null, payments: Payment[]): PaymentPosition | null {
  if (totalCents === null) return null
  const paidCents = paidTotalCents(payments)
  return { paidCents, balanceCents: totalCents - paidCents }
}

/** Printed on the order document under the Advance Paid / Balance Due rows when a
 *  job carries no job-specific payment_terms of its own. */
export const DEFAULT_PAYMENT_TERMS = 'Balance payable on completion of installation.'
