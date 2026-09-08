// Padded to five digits so references sort lexicographically in the same order they
// sort numerically — which is what a plain ORDER BY ref in a list query gives us.
// Past 99999 the number simply grows and that property lapses, which is why jobs also
// stores the raw ref_seq integer to order by.
const PAD = 5

function pad(seq: number): string {
  return String(seq).padStart(PAD, '0')
}

/** The counter value the business is already at on paper — RC194 was the last
 *  hand-written quotation, so the first job this system creates is RC00195. */
export const JOB_REF_SEED = 194

export function formatJobRef(seq: number): string {
  return `RC${pad(seq)}`
}

/** Advance and final invoices share one continuous series; documents.kind tells them
 *  apart. A customer holding INV00007 should be able to find it without knowing which
 *  kind it was. */
export function formatInvoiceNumber(seq: number): string {
  return `INV${pad(seq)}`
}

export function formatWarrantyNumber(seq: number): string {
  return `WC${pad(seq)}`
}
