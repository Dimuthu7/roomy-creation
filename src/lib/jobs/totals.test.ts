import { describe, it, expect } from 'vitest'
import { deliveryRow, isResolved, jobTotals, resolvedOption } from './totals'
import type { JobMoney, JobUnit } from './totals'

function option(over: Partial<JobUnit['options'][number]> = {}) {
  return {
    id: 'opt-1',
    label: null,
    priceCents: 100_00,
    qty: 1,
    selected: false,
    specs: [],
    ...over,
  }
}

function unit(over: Partial<JobUnit> = {}): JobUnit {
  return { id: 'unit-1', title: 'Unit', options: [option()], ...over }
}

// The two real documents this design was built from.
const RC188: JobMoney = {
  units: [
    unit({ id: 'u1', title: 'Unite 01- Cupboards With Doors', options: [option({ id: 'a', priceCents: 235_000_00 })] }),
    unit({ id: 'u2', title: 'Unite 02- Cupboards Without Doors', options: [option({ id: 'b', priceCents: 148_000_00 })] }),
    unit({ id: 'u3', title: 'Table 01', options: [option({ id: 'c', priceCents: 24_500_00 })] }),
    unit({ id: 'u4', title: 'Table 02', options: [option({ id: 'd', priceCents: 22_500_00 })] }),
  ],
  discountCents: 30_000_00,
  freeDelivery: false,
  deliveryChargeCents: null,
}

const RC194: JobMoney = {
  units: [
    unit({ id: 'u1', title: 'Wardrobe with Dressing Unite', options: [option({ id: 'a', priceCents: 368_500_00 })] }),
    unit({
      id: 'u2',
      title: 'Study Cupboards',
      options: [
        option({ id: 'b', label: 'Option 01', priceCents: 182_500_00 }),
        option({ id: 'c', label: 'Option 02', priceCents: 257_000_00 }),
      ],
    }),
  ],
  discountCents: 0,
  freeDelivery: true,
  deliveryChargeCents: null,
}

describe('resolvedOption', () => {
  it('resolves a single-option unit implicitly, without it being marked selected', () => {
    const u = unit({ options: [option({ id: 'only', selected: false })] })
    expect(resolvedOption(u)?.id).toBe('only')
  })

  it('resolves a multi-option unit only once one is marked selected', () => {
    const u = unit({ options: [option({ id: 'a' }), option({ id: 'b' })] })
    expect(resolvedOption(u)).toBeNull()
    u.options[1].selected = true
    expect(resolvedOption(u)?.id).toBe('b')
  })

  it('returns null for a unit with no options at all', () => {
    expect(resolvedOption(unit({ options: [] }))).toBeNull()
  })
})

describe('isResolved', () => {
  it('is true for RC188, whose units all have a single option', () => {
    expect(isResolved(RC188.units)).toBe(true)
  })

  it('is false for RC194, whose Study Cupboards still offers a choice', () => {
    expect(isResolved(RC194.units)).toBe(false)
  })

  it('is false for a job with no units, which has nothing to total', () => {
    expect(isResolved([])).toBe(false)
  })
})

describe('jobTotals', () => {
  it('reproduces the RC188 totals block exactly', () => {
    const totals = jobTotals(RC188)
    expect(totals).not.toBeNull()
    expect(totals!.subtotalCents).toBe(430_000_00)
    expect(totals!.discountCents).toBe(30_000_00)
    expect(totals!.totalCents).toBe(400_000_00)
  })

  it('returns null for RC194, so the PDF omits the totals block', () => {
    expect(jobTotals(RC194)).toBeNull()
  })

  it('multiplies price by quantity', () => {
    const job: JobMoney = {
      units: [unit({ options: [option({ priceCents: 22_500_00, qty: 3 })] })],
      discountCents: 0,
      freeDelivery: true,
      deliveryChargeCents: null,
    }
    expect(jobTotals(job)!.subtotalCents).toBe(67_500_00)
  })

  it('adds a delivery charge to the total when delivery is not free', () => {
    const job: JobMoney = { ...RC188, discountCents: 0, freeDelivery: false, deliveryChargeCents: 5_000_00 }
    expect(jobTotals(job)!.totalCents).toBe(435_000_00)
  })

  it('ignores a stale delivery charge when free delivery is ticked', () => {
    const job: JobMoney = { ...RC188, discountCents: 0, freeDelivery: true, deliveryChargeCents: 5_000_00 }
    expect(jobTotals(job)!.deliveryCents).toBe(0)
    expect(jobTotals(job)!.totalCents).toBe(430_000_00)
  })

  it('totals a multi-option job once the customer has chosen', () => {
    const chosen: JobMoney = {
      ...RC194,
      units: RC194.units.map((u) =>
        u.id === 'u2' ? { ...u, options: u.options.map((o) => ({ ...o, selected: o.id === 'b' })) } : u,
      ),
    }
    expect(jobTotals(chosen)!.totalCents).toBe(551_000_00)
  })
})

describe('deliveryRow', () => {
  it('is free when the free-delivery box is ticked, as on RC194', () => {
    expect(deliveryRow(RC194)).toBe('free')
  })

  it('is charged when a delivery amount is entered', () => {
    expect(deliveryRow({ ...RC188, deliveryChargeCents: 5_000_00 })).toBe('charged')
  })

  it('is omitted when delivery is neither free nor charged, as on RC188', () => {
    expect(deliveryRow(RC188)).toBe('none')
  })

  it('is omitted when an explicit zero is entered rather than printing a 0.00 row', () => {
    expect(deliveryRow({ ...RC188, deliveryChargeCents: 0 })).toBe('none')
  })
})
