import { describe, it, expect } from 'vitest'
import { ReceiptDocument } from './ReceiptDocument'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: ReceiptSnapshot = {
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
  it('titles itself RECEIPT and prints its own number', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('RECEIPT')
    expect(text).toContain('RCP00001')
  })

  it('prints the customer name, amount, job reference and reason', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Mr. W. Williams')
    expect(text).toContain('150,000.00')
    expect(text).toContain('RC00188')
    expect(text).toContain('advance payment')
  })

  it('prints the payment method when present', () => {
    expect(textOf(ReceiptDocument({ snapshot: SNAPSHOT }))).toContain('Bank transfer')
  })

  it('omits the method line when none was recorded', () => {
    // Check for the double-space pattern ('  by ') to avoid false-positive from "Approved by Client"
    // in the signature block. The method suffix uses two spaces: `${paidAtLabel}  by ${method}`,
    // while the signature text "Approved by Client" has only one space before "by".
    expect(textOf(ReceiptDocument({ snapshot: { ...SNAPSHOT, method: null } }))).not.toContain('  by ')
  })

  it('prints the balance remaining when known', () => {
    expect(textOf(ReceiptDocument({ snapshot: SNAPSHOT }))).toContain('218,500.00')
  })

  it('omits the balance remaining line when the job has no total yet', () => {
    const text = textOf(ReceiptDocument({ snapshot: { ...SNAPSHOT, balanceRemainingLabel: null } }))
    expect(text).not.toContain('Balance remaining')
  })

  it('carries the signature block and standing footer copy', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain("Client's Signature")
    expect(text).toContain('Thank You For Your Business!')
  })
})
