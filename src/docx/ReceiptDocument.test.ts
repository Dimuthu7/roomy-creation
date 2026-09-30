import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import { receiptDocument } from './ReceiptDocument'
import { textOf } from './textOf'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: ReceiptSnapshot = {
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

  it('prints the payment method and balance remaining', async () => {
    const text = await textFor(SNAPSHOT)
    expect(text).toContain('01-April-2026 by Cash')
    expect(text).toContain('Balance remaining')
    expect(text).toContain('135,000.00')
  })

  it('omits the balance remaining row when null', async () => {
    const text = await textFor({ ...SNAPSHOT, balanceRemainingLabel: null })
    expect(text).not.toContain('Balance remaining')
  })
})
