import { describe, it, expect } from 'vitest'
import { QuotationDocument } from './QuotationDocument'
import type { QuotationSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: QuotationSnapshot = {
  ref: 'RC00188',
  quotationDate: '21-March-2026',
  salesPerson: 'ISHAN',
  customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: ['Galapitamulla', 'Kurunegala.'], city: null, district: null },
  units: [
    {
      title: 'Unite 01- Cupboards With Doors',
      options: [{ label: null, priceLabel: '235,000.00', qtyLabel: '01', totalLabel: '235,000.00', specs: [{ label: 'Carcase', value: 'Fabrication of cupboards carcase' }] }],
    },
  ],
  delivery: { kind: 'none', amountLabel: null },
  totals: { subtotalLabel: '430,000.00', discountLabel: 'Cash Discount', discountAmountLabel: '30,000.00', totalLabel: '400,000.00' },
  terms: [{ body: 'Manufacturing time - 15 to 30 days after the advance payment paid.', emphasis: false }],
  warranty: [],
}

/** Collects every string in a React element tree, so assertions can be made about
 *  what the document says without rendering it to PDF bytes. */
function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('QuotationDocument', () => {
  it('prints the reference, date and sales person', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('RC00188')
    expect(text).toContain('21-March-2026')
    expect(text).toContain('ISHAN')
  })

  it('prints the customer block', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('williams')
    expect(text).toContain('Galapitamulla')
    expect(text).toContain('+94 772383430')
  })

  it('prints each unit with its specification lines and money columns', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Unite 01- Cupboards With Doors')
    expect(text).toContain('Carcase')
    expect(text).toContain('235,000.00')
    expect(text).toContain('01')
  })

  it('prints the totals block when the job resolves', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Cash Discount')
    expect(text).toContain('400,000.00')
  })

  it('omits the totals block entirely when a choice is still open', () => {
    const text = textOf(QuotationDocument({ snapshot: { ...SNAPSHOT, totals: null } }))
    expect(text).not.toContain('Cash Discount')
    expect(text).not.toContain('400,000.00')
  })

  it('omits the discount row when there is no discount', () => {
    const totals = { ...SNAPSHOT.totals!, discountAmountLabel: null }
    expect(textOf(QuotationDocument({ snapshot: { ...SNAPSHOT, totals } }))).not.toContain('Cash Discount')
  })

  it('prints the free-delivery row', () => {
    const text = textOf(QuotationDocument({ snapshot: { ...SNAPSHOT, delivery: { kind: 'free', amountLabel: null } } }))
    expect(text).toContain('Delivery Charges & Installation Charges For All Items')
    expect(text).toContain('Free')
  })

  it('omits the delivery row when it is neither free nor charged', () => {
    expect(textOf(QuotationDocument({ snapshot: SNAPSHOT }))).not.toContain('Delivery Charges')
  })

  it('prints option labels only when the unit offers a choice', () => {
    const withChoice: QuotationSnapshot = {
      ...SNAPSHOT,
      totals: null,
      units: [
        {
          title: 'Study Cupboards',
          options: [
            { label: 'Option 01', priceLabel: '182,500.00', qtyLabel: '01', totalLabel: '182,500.00', specs: [] },
            { label: 'Option 02', priceLabel: '257,000.00', qtyLabel: '01', totalLabel: '257,000.00', specs: [] },
          ],
        },
      ],
    }
    const text = textOf(QuotationDocument({ snapshot: withChoice }))
    expect(text).toContain('Option 01')
    expect(text).toContain('Option 02')
    expect(textOf(QuotationDocument({ snapshot: SNAPSHOT }))).not.toContain('Option 01')
  })

  it('prints the terms and the standing footer copy', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Manufacturing time - 15 to 30 days after the advance payment paid.')
    expect(text).toContain('Our Furniture Is Made From The Finest Quality Materials')
    expect(text).toContain("Client's Signature")
    expect(text).toContain('Thank You For Your Business!')
  })

  it('uses no unicode bullet glyphs, which the standard PDF fonts cannot render', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).not.toContain('❖')
    expect(text).not.toContain('➢')
  })
})
