import { describe, it, expect } from 'vitest'
import { CompletionDocument } from './CompletionDocument'
import type { CompletionSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: CompletionSnapshot = {
  number: 'WC00001',
  ref: 'RC00188',
  quotationDate: '2026-03-21',
  confirmedDate: '2026-04-02',
  completedDate: '2026-09-22',
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
  payments: [
    { paidAtLabel: '2026-01-01', kindLabel: 'Advance payment', method: 'Bank transfer', amountLabel: '100,000.00' },
    { paidAtLabel: '2026-02-01', kindLabel: 'Final payment', method: 'Cash', amountLabel: '135,000.00' },
  ],
  paymentPosition: { paidLabel: '235,000.00', balanceLabel: '0.00' },
  terms: [{ body: 'Delivery within 15 to 30 days.', emphasis: false }],
  warranty: [{ body: 'Five year warranty on structure.', emphasis: true }],
}

function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('CompletionDocument', () => {
  it('titles itself COMPLETION CERTIFICATE', () => {
    expect(textOf(CompletionDocument({ snapshot: SNAPSHOT }))).toContain('COMPLETION CERTIFICATE')
  })

  it('prints its own WC number and the job ref as a cross-reference', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('WC00001')
    expect(text).toContain('RC00188')
  })

  it('prints both the confirmed and completed dates', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('2026-04-02')
    expect(text).toContain('2026-09-22')
  })

  it('lists the delivered items, so a later warranty claim shows what is covered', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Unite 01- Cupboards With Doors')
    expect(text).toContain('235,000.00')
  })

  it('prints every payment with its date, kind, method and amount', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('2026-01-01')
    expect(text).toContain('Advance payment')
    expect(text).toContain('Bank transfer')
    expect(text).toContain('100,000.00')
    expect(text).toContain('Final payment')
    expect(text).toContain('Cash')
  })

  it('prints the paid and balance position', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Total Paid')
    expect(text).toContain('Balance')
  })

  it('states an outstanding balance plainly rather than hiding it', () => {
    const owing: CompletionSnapshot = {
      ...SNAPSHOT,
      paymentPosition: { paidLabel: '100,000.00', balanceLabel: '135,000.00' },
    }
    expect(textOf(CompletionDocument({ snapshot: owing }))).toContain('135,000.00')
  })

  it('prints the warranty and the terms', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Warranty')
    expect(text).toContain('Five year warranty on structure.')
    expect(text).toContain('Terms & Conditions')
    expect(text).toContain('Delivery within 15 to 30 days.')
  })

  it('renders without a payment position when the job never resolved', () => {
    const text = textOf(CompletionDocument({ snapshot: { ...SNAPSHOT, paymentPosition: null, totals: null } }))
    expect(text).toContain('COMPLETION CERTIFICATE')
    expect(text).not.toContain('Total Paid')
  })

  it('keeps the standing footer copy', () => {
    expect(textOf(CompletionDocument({ snapshot: SNAPSHOT }))).toContain('Thank You For Your Business!')
  })
})
