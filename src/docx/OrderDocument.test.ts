import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import { orderDocument } from './OrderDocument'
import { textOf } from './textOf'
import type { OrderSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: OrderSnapshot = {
  ref: 'RC00188',
  quotationDate: '21-March-2026',
  confirmedDate: '02-April-2026',
  salesPerson: 'ISHAN',
  customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: ['Galapitamulla'], city: null, district: null },
  units: [
    {
      title: 'Unite 01- Cupboards With Doors',
      options: [{ label: null, priceLabel: '235,000.00', qtyLabel: '01', totalLabel: '235,000.00', specs: [] }],
    },
  ],
  delivery: { kind: 'none', amountLabel: null },
  totals: { subtotalLabel: '235,000.00', discountLabel: 'Cash Discount', discountAmountLabel: null, totalLabel: '235,000.00' },
  terms: [],
  warranty: [],
  paymentPosition: { paidLabel: '100,000.00', balanceLabel: '135,000.00' },
  paymentTerms: 'Balance due before delivery.',
}

async function textFor(snapshot: OrderSnapshot): Promise<string> {
  return textOf(await Packer.toBuffer(orderDocument(snapshot)))
}

describe('orderDocument', () => {
  it('prints the order title and confirmed date', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('ORDER')
    expect(text).toContain('02-April-2026')
    expect(text).toContain('RC00188')
  })

  it('prints the advance and balance payment rows when a payment position exists', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('Advance')
    expect(text).not.toContain('Advance Paid')
    expect(text).toContain('100,000.00')
    expect(text).toContain('Balance Payment')
    expect(text).toContain('135,000.00')
    expect(text).toContain('Balance due before delivery.')
  })

  it('omits the payment position and terms sentence when there is no payment position', async () => {
    const text = await textFor({ ...SNAPSHOT, paymentPosition: null })
    expect(text).not.toContain('Advance')
    expect(text).not.toContain('Balance due before delivery.')
  })
})
