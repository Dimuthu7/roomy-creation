import { describe, it, expect } from 'vitest'
import { buildQuotationSnapshot, buildOrderSnapshot, buildReceiptSnapshot, buildCompletionSnapshot } from './snapshot'
import type { SnapshotInput, OrderSnapshotInput, ReceiptSnapshotInput, CompletionSnapshotInput } from './snapshot'

const BASE: SnapshotInput = {
  ref: 'RC00188',
  quotationDate: '2026-03-21',
  salesPerson: 'ISHAN',
  customer: {
    name: 'williams',
    phone: '+94 772383430',
    email: null,
    addressLines: ['Galapitamulla', 'Kurunegala.'],
    city: null,
    district: null,
  },
  units: [
    {
      id: 'u1',
      title: 'Unite 01- Cupboards With Doors - W 2950mm x H 1980mm x D 485mm',
      options: [
        {
          id: 'o1',
          label: null,
          priceCents: 235_000_00,
          qty: 1,
          selected: false,
          specs: [{ label: 'Carcase', value: 'Fabrication of cupboards carcase made out with 18mm Melamine faced Heavier boards (Matt White).' }],
        },
      ],
    },
  ],
  discountLabel: 'Cash Discount',
  discountCents: 30_000_00,
  freeDelivery: false,
  deliveryChargeCents: null,
  terms: [{ body: 'Manufacturing time - 15 to 30 days after the advance payment paid.', emphasis: false }],
  warranty: [],
}

describe('buildQuotationSnapshot', () => {
  it('carries the reference and meta block through', () => {
    const snap = buildQuotationSnapshot(BASE)
    expect(snap.ref).toBe('RC00188')
    expect(snap.salesPerson).toBe('ISHAN')
  })

  it('flattens each unit to the single option it resolves to', () => {
    const snap = buildQuotationSnapshot(BASE)
    expect(snap.units[0].options).toHaveLength(1)
    expect(snap.units[0].options[0].priceLabel).toBe('235,000.00')
    expect(snap.units[0].options[0].totalLabel).toBe('235,000.00')
  })

  it('keeps both options and prints no totals while a choice is open', () => {
    const snap = buildQuotationSnapshot({
      ...BASE,
      discountCents: 0,
      units: [
        {
          id: 'u1',
          title: 'Study Cupboards',
          options: [
            { id: 'a', label: 'Option 01', priceCents: 182_500_00, qty: 1, selected: false, specs: [] },
            { id: 'b', label: 'Option 02', priceCents: 257_000_00, qty: 1, selected: false, specs: [] },
          ],
        },
      ],
    })
    expect(snap.units[0].options).toHaveLength(2)
    expect(snap.totals).toBeNull()
  })

  it('renders the RC188 totals block with formatted amounts', () => {
    const snap = buildQuotationSnapshot({
      ...BASE,
      units: [
        ...BASE.units,
        { id: 'u2', title: 'Table 01', options: [{ id: 'o2', label: null, priceCents: 195_000_00, qty: 1, selected: false, specs: [] }] },
      ],
    })
    expect(snap.totals).toEqual({
      subtotalLabel: '430,000.00',
      discountLabel: 'Cash Discount',
      discountAmountLabel: '30,000.00',
      totalLabel: '400,000.00',
    })
  })

  it('omits the discount row when there is no discount', () => {
    const snap = buildQuotationSnapshot({ ...BASE, discountCents: 0 })
    expect(snap.totals!.discountAmountLabel).toBeNull()
  })

  it('marks delivery as free when the box is ticked', () => {
    expect(buildQuotationSnapshot({ ...BASE, freeDelivery: true }).delivery).toEqual({ kind: 'free', amountLabel: null })
  })

  it('omits the delivery row when it is neither free nor charged', () => {
    expect(buildQuotationSnapshot(BASE).delivery).toEqual({ kind: 'none', amountLabel: null })
  })

  it('formats a charged delivery amount', () => {
    const snap = buildQuotationSnapshot({ ...BASE, freeDelivery: false, deliveryChargeCents: 5_000_00 })
    expect(snap.delivery).toEqual({ kind: 'charged', amountLabel: '5,000.00' })
  })

  it('is self-contained — no ids leak into the snapshot', () => {
    const json = JSON.stringify(buildQuotationSnapshot(BASE))
    expect(json).not.toContain('"id"')
  })

  it('survives a JSON round trip unchanged, since it is stored as jsonb', () => {
    const snap = buildQuotationSnapshot(BASE)
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap)
  })
})

const RESOLVED_UNIT = {
  id: 'u1',
  title: 'Wardrobe with Dressing Unite',
  options: [{ id: 'o1', label: null, priceCents: 368_500_00, qty: 1, selected: false, specs: [] }],
}

const ORDER_BASE: OrderSnapshotInput = {
  ...BASE,
  units: [RESOLVED_UNIT],
  discountCents: 0,
  confirmedDate: '2026-09-19',
  paymentTerms: null,
  payments: [{ amountCents: 150_000_00 }],
}

describe('buildOrderSnapshot', () => {
  it('carries the quotation fields through unchanged', () => {
    const snap = buildOrderSnapshot(ORDER_BASE)
    expect(snap.ref).toBe('RC00188')
    expect(snap.customer.name).toBe('williams')
  })

  it('uses the confirmed date, not the quotation date', () => {
    expect(buildOrderSnapshot(ORDER_BASE).confirmedDate).toBe('2026-09-19')
  })

  it('computes the payment position against the resolved total', () => {
    const snap = buildOrderSnapshot(ORDER_BASE)
    expect(snap.paymentPosition).toEqual({ paidLabel: '150,000.00', balanceLabel: '218,500.00' })
  })

  it('falls back to the default payment terms sentence when none is set', () => {
    expect(buildOrderSnapshot(ORDER_BASE).paymentTerms).toBe('Balance payable on completion of installation.')
  })

  it('uses a custom payment terms sentence when one is set', () => {
    const snap = buildOrderSnapshot({ ...ORDER_BASE, paymentTerms: 'Balance due on delivery.' })
    expect(snap.paymentTerms).toBe('Balance due on delivery.')
  })

  it('has no payment position when the job is not actually resolved', () => {
    const unresolvedUnit = {
      id: 'u2',
      title: 'Study Cupboards',
      options: [
        { id: 'a', label: 'Option 01', priceCents: 182_500_00, qty: 1, selected: false, specs: [] },
        { id: 'b', label: 'Option 02', priceCents: 257_000_00, qty: 1, selected: false, specs: [] },
      ],
    }
    const snap = buildOrderSnapshot({ ...ORDER_BASE, units: [unresolvedUnit] })
    expect(snap.totals).toBeNull()
    expect(snap.paymentPosition).toBeNull()
  })
})

const RECEIPT_BASE: ReceiptSnapshotInput = {
  number: 'RCP00001',
  ref: 'RC00188',
  customerName: 'williams',
  amountCents: 150_000_00,
  kind: 'advance',
  paidAt: '2026-09-19',
  method: 'Bank transfer',
  totalCents: 368_500_00,
  paymentsIncludingThis: [{ amountCents: 150_000_00 }],
}

describe('buildReceiptSnapshot', () => {
  it('carries the number, job reference and customer name through', () => {
    const snap = buildReceiptSnapshot(RECEIPT_BASE)
    expect(snap.number).toBe('RCP00001')
    expect(snap.ref).toBe('RC00188')
    expect(snap.customerName).toBe('williams')
  })

  it('formats the amount', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).amountLabel).toBe('150,000.00')
  })

  it('labels an advance payment', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).kindLabel).toBe('advance payment')
  })

  it('labels a final payment', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, kind: 'final' }).kindLabel).toBe('final payment')
  })

  it('uses the note verbatim for an other-kind payment', () => {
    const snap = buildReceiptSnapshot({ ...RECEIPT_BASE, kind: 'other', note: 'Deposit refund adjustment' })
    expect(snap.kindLabel).toBe('Deposit refund adjustment')
  })

  it('falls back to a generic label for an other-kind payment with no note', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, kind: 'other', note: null }).kindLabel).toBe('payment')
  })

  it('computes the balance remaining as of this receipt, including the payment it is for', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).balanceRemainingLabel).toBe('218,500.00')
  })

  it('has no balance remaining when the job has no total yet', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, totalCents: null }).balanceRemainingLabel).toBeNull()
  })

  it('carries the payment method through', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).method).toBe('Bank transfer')
  })

  it('is null when no method was recorded', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, method: null }).method).toBeNull()
  })
})

describe('buildCompletionSnapshot', () => {
  const BASE: CompletionSnapshotInput = {
    ref: 'RC00188',
    number: 'WC00001',
    quotationDate: '2026-03-21',
    confirmedDate: '2026-04-02',
    completedDate: '2026-09-22',
    salesPerson: 'ISHAN',
    customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: [], city: null, district: null },
    units: [
      {
        id: 'u1',
        title: 'Unit 01',
        options: [{ id: 'o1', label: null, priceCents: 300_000_00, qty: 1, selected: true, specs: [] }],
      },
    ],
    discountLabel: 'Cash Discount',
    discountCents: 0,
    freeDelivery: false,
    deliveryChargeCents: null,
    terms: [{ body: 'A term.', emphasis: false }],
    warranty: [{ body: 'A warranty clause.', emphasis: true }],
    payments: [
      // Deliberately newest-first, as listPayments returns them.
      { amountCents: 200_000_00, paidAt: '2026-02-01', kind: 'final', method: 'Cash', note: null, createdAt: new Date('2026-02-01T00:00:00Z') },
      { amountCents: 100_000_00, paidAt: '2026-01-01', kind: 'advance', method: 'Bank transfer', note: null, createdAt: new Date('2026-01-01T00:00:00Z') },
    ],
  }

  it('carries its own WC number alongside the job ref, not instead of it', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.number).toBe('WC00001')
    expect(snapshot.ref).toBe('RC00188')
  })

  it('keeps the quotation body — units, totals, terms and warranty', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.units[0].title).toBe('Unit 01')
    expect(snapshot.totals?.totalLabel).toBe('300,000.00')
    expect(snapshot.terms).toEqual([{ body: 'A term.', emphasis: false }])
    expect(snapshot.warranty).toEqual([{ body: 'A warranty clause.', emphasis: true }])
  })

  it('prints the payment ledger oldest-first, however the input was ordered', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.payments.map((p) => p.paidAtLabel)).toEqual(['2026-01-01', '2026-02-01'])
  })

  it('labels each payment with the same wording the receipt uses, capitalised for a table', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.payments[0].kindLabel).toBe('Advance payment')
    expect(snapshot.payments[1].kindLabel).toBe('Final payment')
  })

  it("uses an 'other' payment's note as its label, falling back to a generic word", () => {
    const withOther = buildCompletionSnapshot({
      ...BASE,
      payments: [
        { amountCents: 1_000_00, paidAt: '2026-01-05', kind: 'other', method: null, note: 'Site visit fee', createdAt: new Date('2026-01-05T00:00:00Z') },
        { amountCents: 2_000_00, paidAt: '2026-01-06', kind: 'other', method: null, note: null, createdAt: new Date('2026-01-06T00:00:00Z') },
      ],
    })
    expect(withOther.payments[0].kindLabel).toBe('Site visit fee')
    expect(withOther.payments[1].kindLabel).toBe('Payment')
  })

  it('formats amounts and carries the method through', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.payments[0].amountLabel).toBe('100,000.00')
    expect(snapshot.payments[0].method).toBe('Bank transfer')
  })

  it('reports a settled position when the payments cover the total', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.paymentPosition).toEqual({ paidLabel: '300,000.00', balanceLabel: '0.00' })
  })

  it('reports a positive balance rather than hiding it, so a certificate never conceals an unpaid amount', () => {
    const snapshot = buildCompletionSnapshot({ ...BASE, payments: [BASE.payments[1]] })
    expect(snapshot.paymentPosition).toEqual({ paidLabel: '100,000.00', balanceLabel: '200,000.00' })
  })

  it('reports an overpayment as a negative balance rather than clamping it to zero', () => {
    const overpaid = buildCompletionSnapshot({
      ...BASE,
      payments: [{ amountCents: 350_000_00, paidAt: '2026-01-01', kind: 'final', method: null, note: null, createdAt: new Date('2026-01-01T00:00:00Z') }],
    })
    expect(overpaid.paymentPosition?.balanceLabel).toBe('-50,000.00')
  })

  it('has a null position when a unit is still unresolved, since no total exists to settle against', () => {
    const unresolved = buildCompletionSnapshot({
      ...BASE,
      units: [
        {
          id: 'u1',
          title: 'Unit 01',
          options: [
            { id: 'o1', label: 'A', priceCents: 100_00, qty: 1, selected: false, specs: [] },
            { id: 'o2', label: 'B', priceCents: 200_00, qty: 1, selected: false, specs: [] },
          ],
        },
      ],
    })
    expect(unresolved.totals).toBeNull()
    expect(unresolved.paymentPosition).toBeNull()
  })

  it('carries both dates, so the certificate can state how long the job took', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.confirmedDate).toBe('2026-04-02')
    expect(snapshot.completedDate).toBe('2026-09-22')
  })
})
