import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import { completionDocument } from './CompletionDocument'
import { textOf } from './textOf'
import type { CompletionSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: CompletionSnapshot = {
  number: 'WC00001',
  ref: 'RC00188',
  quotationDate: '21-March-2026',
  confirmedDate: '02-April-2026',
  completedDate: '22-September-2026',
  salesPerson: 'ISHAN',
  customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: [], city: null, district: null },
  units: [
    {
      title: 'Unite 01- Cupboards With Doors',
      options: [{ label: null, priceLabel: '235,000.00', qtyLabel: '01', totalLabel: '235,000.00', specs: [] }],
    },
  ],
  delivery: { kind: 'none', amountLabel: null },
  totals: { subtotalLabel: '235,000.00', discountLabel: 'Cash Discount', discountAmountLabel: null, totalLabel: '235,000.00' },
  terms: [],
  warranty: [{ body: '1 year warranty on all fittings.', emphasis: true }],
  payments: [{ paidAtLabel: '01-April-2026', kindLabel: 'Advance payment', method: 'Cash', amountLabel: '235,000.00' }],
  paymentPosition: { paidLabel: '235,000.00', balanceLabel: '0.00' },
  companyEmail: 'roomycreation@gmail.com',
}

async function textFor(snapshot: CompletionSnapshot): Promise<string> {
  return textOf(await Packer.toBuffer(completionDocument(snapshot)))
}

describe('completionDocument', () => {
  it('prints the certificate number and both dates', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('WC00001')
    expect(text).toContain('22-September-2026')
    expect(text).toContain('02-April-2026')
    expect(text).toContain('RC00188')
  })

  it('prints the payment ledger and balance', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('Payment Details')
    expect(text).toContain('Advance payment')
    expect(text).toContain('Cash')
    expect(text).toContain('Balance')
    expect(text).toContain('0.00')
  })

  it('omits the payment ledger for a job with no payments', async () => {
    const text = await textFor({ ...SNAPSHOT, payments: [], paymentPosition: null })
    expect(text).not.toContain('Payment Details')
  })

  it('prints warranty ahead of terms, matching the PDF ordering', async () => {
    const text = await textFor(SNAPSHOT)
    const warrantyIndex = text.indexOf('Warranty')
    const itemsIndex = text.indexOf('Items Delivered')
    expect(warrantyIndex).toBeGreaterThan(itemsIndex)
    expect(text).toContain('1 year warranty on all fittings.')
  })
})
