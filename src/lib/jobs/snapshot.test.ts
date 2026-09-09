import { describe, it, expect } from 'vitest'
import { buildQuotationSnapshot } from './snapshot'
import type { SnapshotInput } from './snapshot'

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
