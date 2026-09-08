// Pure money logic over a job's units. No database types here on purpose: the PDF
// renderer, the admin editor's live preview and the document snapshot all need these
// same rules, and only one of the three has rows from Drizzle in hand.

export interface SpecLine {
  /** Optional: RC188's "01 Soft closing drawer with 01 cupboard" has no label. */
  label: string | null
  value: string
}

export interface UnitOption {
  id: string
  /** Null on a single-option unit — nothing is printed above its spec lines. */
  label: string | null
  priceCents: number
  qty: number
  selected: boolean
  specs: SpecLine[]
}

export interface JobUnit {
  id: string
  title: string
  options: UnitOption[]
}

export interface JobMoney {
  units: JobUnit[]
  discountCents: number
  freeDelivery: boolean
  deliveryChargeCents: number | null
}

export interface JobTotals {
  subtotalCents: number
  discountCents: number
  deliveryCents: number
  totalCents: number
}

export type DeliveryRow = 'free' | 'charged' | 'none'

/** The option a unit currently stands for, or null while a choice is still open.
 *  A one-option unit is implicitly selected — that state is derived here rather than
 *  stored, so there is nothing to keep in sync when an option is added or removed. */
export function resolvedOption(unit: JobUnit): UnitOption | null {
  if (unit.options.length === 1) return unit.options[0]
  return unit.options.find((o) => o.selected) ?? null
}

/** True when every unit stands for exactly one option, so the job can be totalled.
 *  A job with no units is not resolved: there is nothing to total, and printing a
 *  0.00 total on an empty quotation would be worse than printing none. */
export function isResolved(units: JobUnit[]): boolean {
  return units.length > 0 && units.every((unit) => resolvedOption(unit) !== null)
}

/** Null while any choice is open — which is exactly why RC194 carries no totals block
 *  and RC188 does. Callers render the block only for a non-null result. */
export function jobTotals(job: JobMoney): JobTotals | null {
  if (!isResolved(job.units)) return null

  const subtotalCents = job.units.reduce((sum, unit) => {
    const option = resolvedOption(unit)
    return option ? sum + option.priceCents * option.qty : sum
  }, 0)

  // Free delivery wins over any amount left in the field, so unticking the box,
  // typing an amount and re-ticking it cannot silently charge the customer.
  const deliveryCents = job.freeDelivery ? 0 : (job.deliveryChargeCents ?? 0)

  return {
    subtotalCents,
    discountCents: job.discountCents,
    deliveryCents,
    totalCents: subtotalCents - job.discountCents + deliveryCents,
  }
}

/** Which of the three delivery behaviours applies. 'none' omits the row entirely,
 *  as RC188 does; a zero amount is treated as "not charging" rather than as a
 *  0.00 line, which no one would deliberately print. */
export function deliveryRow(job: JobMoney): DeliveryRow {
  if (job.freeDelivery) return 'free'
  if (job.deliveryChargeCents && job.deliveryChargeCents > 0) return 'charged'
  return 'none'
}
