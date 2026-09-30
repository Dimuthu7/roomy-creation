import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import { quotationDocument } from './QuotationDocument'
import { textOf } from './textOf'
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

async function textFor(snapshot: QuotationSnapshot): Promise<string> {
  return textOf(await Packer.toBuffer(quotationDocument(snapshot)))
}

describe('quotationDocument', () => {
  it('prints the reference, date and sales person', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('RC00188')
    expect(text).toContain('21-March-2026')
    expect(text).toContain('ISHAN')
  })

  it('prints the customer block', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('williams')
    expect(text).toContain('Galapitamulla')
    expect(text).toContain('+94 772383430')
  })

  it('prints each unit with its specification lines and money columns', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('Unite 01- Cupboards With Doors')
    expect(text).toContain('Carcase')
    expect(text).toContain('235,000.00')
  })

  it('prints the totals block when the job resolves', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('Cash Discount')
    expect(text).toContain('400,000.00')
  })

  it('omits the totals block entirely when a choice is still open', async () => {
    const text = await textFor({ ...SNAPSHOT, totals: null })
    expect(text).not.toContain('400,000.00')
  })

  it('omits the discount row when there is no discount', async () => {
    const totals = { ...SNAPSHOT.totals!, discountAmountLabel: null }
    const text = await textFor({ ...SNAPSHOT, totals })
    expect(text).not.toContain('Cash Discount')
  })

  it('prints the free-delivery row', async () => {
    const text = await textFor({ ...SNAPSHOT, delivery: { kind: 'free', amountLabel: null } })
    expect(text).toContain('Delivery Charges & Installation Charges For All Items')
    expect(text).toContain('Free')
  })

  it('omits the delivery row when it is neither free nor charged', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).not.toContain('Delivery Charges')
  })

  it('prints option labels only when the unit offers a choice', async () => {
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
    const withChoiceText = await textFor(withChoice)
    expect(withChoiceText).toContain('Option 01')
    expect(withChoiceText).toContain('Option 02')
    expect(await textFor(SNAPSHOT)).not.toContain('Option 01')
  })

  it('prints the terms and the standing footer copy', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('Manufacturing time - 15 to 30 days after the advance payment paid.')
    expect(text).toContain('Our Furniture Is Made From The Finest Quality Materials')
    expect(text).toContain("Client's Signature")
    expect(text).toContain('Thank You For Your Business!')
  })
})
