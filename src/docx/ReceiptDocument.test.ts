import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import { receiptDocument } from './ReceiptDocument'
import { textOf } from './textOf'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: ReceiptSnapshot = {
  number: 'RCP00042',
  ref: 'RC00188',
  customerName: 'williams',
  customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: ['Galapitamulla', 'Kurunegala.'], city: null, district: null },
  salesPerson: 'ISHAN',
  amountLabel: '100,000.00',
  kindLabel: 'advance payment',
  paidAtLabel: '01-April-2026',
  method: 'Cash',
  totalLabel: '235,000.00',
  paidLabel: '100,000.00',
  balanceRemainingLabel: '135,000.00',
}

/** A receipt issued before the redesign: Word export re-renders from the jsonb that
 *  was stored then, which has none of the fields added since. */
const LEGACY_SNAPSHOT: ReceiptSnapshot = {
  number: 'RCP00042',
  ref: 'RC00188',
  customerName: 'williams',
  amountLabel: '100,000.00',
  kindLabel: 'advance payment',
  paidAtLabel: '01-April-2026',
  method: 'Cash',
  balanceRemainingLabel: '135,000.00',
}

async function textFor(snapshot: ReceiptSnapshot): Promise<string> {
  return textOf(await Packer.toBuffer(receiptDocument(snapshot)))
}

describe('receiptDocument', () => {
  it('prints the receipt number, customer and amount', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('RCP00042')
    expect(text).toContain('williams')
    expect(text).toContain('100,000.00')
    expect(text).toContain('advance payment for RC00188')
  })

  it('prints the masthead contact stack and the client details block', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('Web - roomycreations.com')
    expect(text).toContain('Client Details - williams')
    expect(text).toContain('Galapitamulla')
  })

  it('prints the date and sales person in the meta panel', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('01-April-2026')
    expect(text).toContain('ISHAN')
  })

  it('prints the payment method and the job position', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('Cash')
    expect(text).toContain('Total Price')
    expect(text).toContain('235,000.00')
    expect(text).toContain('Advance')
    expect(text).toContain('Balance Payment')
    expect(text).toContain('135,000.00')
  })

  it('omits the method row when none was recorded', async () => {
    expect(await textFor({ ...SNAPSHOT, method: null })).not.toContain('Method')
  })

  it('omits the whole money block when the job has no total yet', async () => {
    const text = await textFor({ ...SNAPSHOT, totalLabel: null, paidLabel: null, balanceRemainingLabel: null })
    expect(text).not.toContain('Total Price')
    expect(text).not.toContain('Balance Payment')
  })

  it('still renders a receipt stored before the redesign, without its new blocks', async () => {
    const text = await textFor(LEGACY_SNAPSHOT)
    expect(text).toContain('RCP00042')
    expect(text).toContain('100,000.00')
    expect(text).not.toContain('Client Details')
    expect(text).not.toContain('Total Price')
  })
})
