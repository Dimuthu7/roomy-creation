import { describe, it, expect } from 'vitest'
import { ReceiptDocument } from './ReceiptDocument'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: ReceiptSnapshot = {
  number: 'RCP00001',
  ref: 'RC00188',
  customerName: 'Mr. W. Williams',
  customer: { name: 'Mr. W. Williams', phone: '+94 772383430', email: null, addressLines: ['Galapitamulla', 'Kurunegala.'], city: null, district: null },
  salesPerson: 'ISHAN',
  companyEmail: 'roomycreation@gmail.com',
  amountLabel: '150,000.00',
  kindLabel: 'advance payment',
  paidAtLabel: '19 Sep 2026',
  method: 'Bank transfer',
  totalLabel: '368,500.00',
  paidLabel: '150,000.00',
  balanceRemainingLabel: '218,500.00',
}

/** A receipt issued before the redesign: stored as jsonb with only the fields that
 *  existed then. Word export re-renders from exactly this, so it has to keep working. */
const LEGACY_SNAPSHOT: ReceiptSnapshot = {
  number: 'RCP00001',
  ref: 'RC00188',
  customerName: 'Mr. W. Williams',
  amountLabel: '150,000.00',
  kindLabel: 'advance payment',
  paidAtLabel: '19 Sep 2026',
  method: 'Bank transfer',
  balanceRemainingLabel: '218,500.00',
}

function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('ReceiptDocument', () => {
  it('titles itself RECEIPT and carries its number, date and sales person in the masthead', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('RECEIPT')
    expect(text).toContain('RCP00001')
    expect(text).toContain('19 Sep 2026')
    expect(text).toContain('ISHAN')
  })

  it('prints the site-configured company email, and omits it when none is set', () => {
    expect(textOf(ReceiptDocument({ snapshot: SNAPSHOT }))).toContain('roomycreation@gmail.com')
    expect(textOf(ReceiptDocument({ snapshot: { ...SNAPSHOT, companyEmail: null } }))).not.toContain('@')
  })

  it('prints the client details block', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Client Details - Mr. W. Williams')
    expect(text).toContain('Galapitamulla')
    expect(text).toContain('+94 772383430')
  })

  it('acknowledges the payment with its reason, reference and amount', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Mr. W. Williams')
    expect(text).toContain('advance payment for RC00188')
    expect(text).toContain('Amount Received')
    expect(text).toContain('150,000.00')
  })

  it('prints the payment method when present', () => {
    expect(textOf(ReceiptDocument({ snapshot: SNAPSHOT }))).toContain('Bank transfer')
  })

  it('omits the method row when none was recorded', () => {
    expect(textOf(ReceiptDocument({ snapshot: { ...SNAPSHOT, method: null } }))).not.toContain('Method')
  })

  it('closes with the job position in the printed invoices\' own vocabulary', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Total Price')
    expect(text).toContain('368,500.00')
    expect(text).toContain('Advance')
    expect(text).toContain('Balance Payment')
    expect(text).toContain('218,500.00')
  })

  it('states the order total once, not as both a Total and a Total Price row', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text.match(/368,500\.00/g)).toHaveLength(1)
  })

  it('omits the whole money block when the job has no total yet', () => {
    const text = textOf(ReceiptDocument({ snapshot: { ...SNAPSHOT, totalLabel: null, paidLabel: null, balanceRemainingLabel: null } }))
    expect(text).not.toContain('Total Price')
    expect(text).not.toContain('Balance Payment')
  })

  it('still renders a receipt stored before the redesign, without its new blocks', () => {
    const text = textOf(ReceiptDocument({ snapshot: LEGACY_SNAPSHOT }))
    expect(text).toContain('RCP00001')
    expect(text).toContain('150,000.00')
    expect(text).toContain('advance payment for RC00188')
    expect(text).not.toContain('Client Details')
    expect(text).not.toContain('Total Price')
  })

  it('carries the signature block and standing footer copy', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain("Client's Signature")
    expect(text).toContain('Thank You For Your Business!')
  })
})
