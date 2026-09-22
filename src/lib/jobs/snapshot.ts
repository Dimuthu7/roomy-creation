import { formatCents } from '@/lib/money'
import { deliveryRow, jobTotals, resolvedOption } from './totals'
import type { JobUnit } from './totals'
import { DEFAULT_PAYMENT_TERMS, paymentPosition } from './payments'
import type { Payment } from './payments'

// A snapshot is what a document was rendered from, frozen at the moment it was issued.
// It holds no ids and no foreign keys: everything the PDF needs is inlined, so a
// document can be re-rendered years later even after the job and the customer record
// have moved on. It is stored as jsonb, so every field here must survive JSON.
// Amounts are pre-formatted strings, not cents, so a future change to formatting can
// never retroactively alter a document a customer has already signed.

export interface SnapshotCustomer {
  name: string
  phone: string
  email: string | null
  addressLines: string[]
  city: string | null
  district: string | null
}

export interface SnapshotSpec {
  label: string | null
  value: string
}

export interface SnapshotOption {
  label: string | null
  priceLabel: string
  qtyLabel: string
  totalLabel: string
  specs: SnapshotSpec[]
}

export interface SnapshotUnit {
  title: string
  options: SnapshotOption[]
}

export interface SnapshotTotals {
  subtotalLabel: string
  discountLabel: string
  /** Null when there is no discount, so the row is omitted rather than showing 0.00. */
  discountAmountLabel: string | null
  totalLabel: string
}

export interface SnapshotDelivery {
  kind: 'free' | 'charged' | 'none'
  amountLabel: string | null
}

export interface SnapshotClause {
  body: string
  emphasis: boolean
}

export interface QuotationSnapshot {
  ref: string
  quotationDate: string
  salesPerson: string | null
  customer: SnapshotCustomer
  units: SnapshotUnit[]
  delivery: SnapshotDelivery
  totals: SnapshotTotals | null
  terms: SnapshotClause[]
  warranty: SnapshotClause[]
}

export interface SnapshotInput {
  ref: string
  quotationDate: string
  salesPerson: string | null
  customer: SnapshotCustomer
  units: JobUnit[]
  discountLabel: string
  discountCents: number
  freeDelivery: boolean
  deliveryChargeCents: number | null
  terms: SnapshotClause[]
  warranty: SnapshotClause[]
}

function snapshotOption(option: JobUnit['options'][number]): SnapshotOption {
  return {
    label: option.label,
    priceLabel: formatCents(option.priceCents),
    // Zero-padded to match the existing documents, which write "01" not "1".
    qtyLabel: String(option.qty).padStart(2, '0'),
    totalLabel: formatCents(option.priceCents * option.qty),
    specs: option.specs.map((spec) => ({ label: spec.label, value: spec.value })),
  }
}

export function buildQuotationSnapshot(input: SnapshotInput): QuotationSnapshot {
  const money = {
    units: input.units,
    discountCents: input.discountCents,
    freeDelivery: input.freeDelivery,
    deliveryChargeCents: input.deliveryChargeCents,
  }

  const totals = jobTotals(money)
  const delivery = deliveryRow(money)

  return {
    ref: input.ref,
    quotationDate: input.quotationDate,
    salesPerson: input.salesPerson,
    customer: input.customer,
    units: input.units.map((unit) => {
      // A resolved unit prints only the option it stands for; an unresolved one prints
      // every option so the customer can choose. This is the single place that
      // decision is made — the PDF renderer just draws what it is handed.
      const resolved = resolvedOption(unit)
      const options = resolved ? [resolved] : unit.options
      return { title: unit.title, options: options.map(snapshotOption) }
    }),
    delivery: {
      kind: delivery,
      amountLabel: delivery === 'charged' ? formatCents(input.deliveryChargeCents ?? 0) : null,
    },
    totals: totals
      ? {
          subtotalLabel: formatCents(totals.subtotalCents),
          discountLabel: input.discountLabel,
          discountAmountLabel: totals.discountCents > 0 ? formatCents(totals.discountCents) : null,
          totalLabel: formatCents(totals.totalCents),
        }
      : null,
    terms: input.terms,
    warranty: input.warranty,
  }
}

export interface SnapshotPaymentPosition {
  paidLabel: string
  balanceLabel: string
}

export interface OrderSnapshot extends QuotationSnapshot {
  confirmedDate: string
  paymentPosition: SnapshotPaymentPosition | null
  paymentTerms: string
}

export interface OrderSnapshotInput extends SnapshotInput {
  confirmedDate: string
  paymentTerms: string | null
  payments: Payment[]
}

/** Wraps buildQuotationSnapshot rather than duplicating it — the order document's body
 *  is the quotation's body with a different title (handled in OrderDocument.tsx, not
 *  here) plus a payment position and a terms sentence. Deliberately does NOT allocate
 *  a new reference number: the order keeps the job's own ref, per the spec's rule that
 *  the customer knows the job by one number for its whole life. */
export function buildOrderSnapshot(input: OrderSnapshotInput): OrderSnapshot {
  const quotation = buildQuotationSnapshot(input)
  const totals = jobTotals({
    units: input.units,
    discountCents: input.discountCents,
    freeDelivery: input.freeDelivery,
    deliveryChargeCents: input.deliveryChargeCents,
  })
  const position = paymentPosition(totals?.totalCents ?? null, input.payments)

  return {
    ...quotation,
    confirmedDate: input.confirmedDate,
    paymentPosition: position
      ? { paidLabel: formatCents(position.paidCents), balanceLabel: formatCents(position.balanceCents) }
      : null,
    paymentTerms: input.paymentTerms ?? DEFAULT_PAYMENT_TERMS,
  }
}

export interface ReceiptSnapshot {
  number: string
  ref: string
  customerName: string
  amountLabel: string
  kindLabel: string
  paidAtLabel: string
  method: string | null
  balanceRemainingLabel: string | null
}

export interface ReceiptSnapshotInput {
  number: string
  ref: string
  customerName: string
  amountCents: number
  kind: 'advance' | 'final' | 'other'
  note?: string | null
  paidAt: string
  method: string | null
  /** The job's total as of receipt time, or null while unresolved — see paymentPosition. */
  totalCents: number | null
  /** Every payment currently on the job, as of the moment this receipt is generated —
   *  not a historical snapshot frozen at the payment's own time. A reprinted receipt
   *  reflects the job's current position. */
  paymentsIncludingThis: Payment[]
}

function receiptKindLabel(kind: ReceiptSnapshotInput['kind'], note: string | null | undefined): string {
  if (kind === 'advance') return 'advance payment'
  if (kind === 'final') return 'final payment'
  return note && note.trim() !== '' ? note : 'payment'
}

/** Deliberately minimal — a single acknowledgement line, not an itemised invoice.
 *  See the Slice 2 spec's "receipt document" section: this is not the advance/final
 *  invoice reserved for Slice 4. */
export function buildReceiptSnapshot(input: ReceiptSnapshotInput): ReceiptSnapshot {
  const position = paymentPosition(input.totalCents, input.paymentsIncludingThis)
  return {
    number: input.number,
    ref: input.ref,
    customerName: input.customerName,
    amountLabel: formatCents(input.amountCents),
    kindLabel: receiptKindLabel(input.kind, input.note),
    paidAtLabel: input.paidAt,
    method: input.method,
    balanceRemainingLabel: position ? formatCents(position.balanceCents) : null,
  }
}
