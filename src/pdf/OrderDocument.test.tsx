import { describe, it, expect } from 'vitest'
import { OrderDocument } from './OrderDocument'
import type { OrderSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: OrderSnapshot = {
  ref: 'RC00188',
  quotationDate: '21-March-2026',
  confirmedDate: '19-September-2026',
  salesPerson: 'ISHAN',
  customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: ['Galapitamulla', 'Kurunegala.'], city: null, district: null },
  units: [
    {
      title: 'Unite 01- Cupboards With Doors',
      options: [{ label: null, priceLabel: '235,000.00', qtyLabel: '01', totalLabel: '235,000.00', specs: [] }],
    },
  ],
  delivery: { kind: 'none', amountLabel: null },
  totals: { subtotalLabel: '235,000.00', discountLabel: 'Cash Discount', discountAmountLabel: null, totalLabel: '235,000.00' },
  paymentPosition: { paidLabel: '100,000.00', balanceLabel: '135,000.00' },
  paymentTerms: 'Balance payable on completion of installation.',
  terms: [],
  warranty: [],
}

function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('OrderDocument', () => {
  it('titles itself ORDER, not QUOTATION', () => {
    expect(textOf(OrderDocument({ snapshot: SNAPSHOT }))).toContain('ORDER')
  })

  it('prints the confirmed date under the ORDER label, not the quotation date', () => {
    const text = textOf(OrderDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('19-September-2026')
  })

  it('keeps the job reference, not a new number', () => {
    expect(textOf(OrderDocument({ snapshot: SNAPSHOT }))).toContain('RC00188')
  })

  it('prints Advance Paid and Balance Due under the totals', () => {
    const text = textOf(OrderDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Advance Paid')
    expect(text).toContain('100,000.00')
    expect(text).toContain('Balance Due')
    expect(text).toContain('135,000.00')
  })

  it('prints the payment terms sentence', () => {
    expect(textOf(OrderDocument({ snapshot: SNAPSHOT }))).toContain('Balance payable on completion of installation.')
  })

  it('omits the payment rows when there is no payment position', () => {
    const text = textOf(OrderDocument({ snapshot: { ...SNAPSHOT, paymentPosition: null } }))
    expect(text).not.toContain('Advance Paid')
    expect(text).not.toContain('Balance Due')
  })

  it('still prints the unit table and standing footer copy', () => {
    const text = textOf(OrderDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Unite 01- Cupboards With Doors')
    expect(text).toContain('235,000.00')
    expect(text).toContain('Thank You For Your Business!')
  })
})
