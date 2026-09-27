// All amounts in this app are integer cents. Floats are never used for money:
// 0.1 + 0.2 !== 0.3 is not an acceptable property for a document a customer signs.

/** Parses admin money input into integer cents. Accepts the grouped form the existing
 *  paper documents use ("368,500.00") as well as a bare number. Returns null for
 *  anything that is not a non-negative amount with at most two decimal places —
 *  callers turn that into a validation message. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[\s,]/g, '')
  if (cleaned === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  // padEnd, not padStart: "10.5" is ten rupees fifty cents, not ten rupees five.
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'))
}

/** Renders cents as the documents do — grouped, two decimals, no currency symbol. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${sign}${whole.toLocaleString('en-US')}.${frac}`
}
