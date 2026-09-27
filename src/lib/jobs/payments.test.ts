import { describe, it, expect } from 'vitest'
import { DEFAULT_PAYMENT_TERMS, paidTotalCents, paymentPosition } from './payments'

describe('paidTotalCents', () => {
  it('sums every payment', () => {
    expect(paidTotalCents([{ amountCents: 150_000_00 }, { amountCents: 50_000_00 }])).toBe(200_000_00)
  })

  it('is zero when there are no payments', () => {
    expect(paidTotalCents([])).toBe(0)
  })
})

describe('paymentPosition', () => {
  it('is null when the job has no total yet — an unresolved choice cannot have a balance', () => {
    expect(paymentPosition(null, [{ amountCents: 150_000_00 }])).toBeNull()
  })

  it('is null even when no payments have been made against an unresolved job', () => {
    expect(paymentPosition(null, [])).toBeNull()
  })

  it('computes paid and balance against the total', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 150_000_00 }])).toEqual({
      paidCents: 150_000_00,
      balanceCents: 200_000_00,
    })
  })

  it('is a full balance when nothing has been paid', () => {
    expect(paymentPosition(350_000_00, [])).toEqual({ paidCents: 0, balanceCents: 350_000_00 })
  })

  it('sums multiple payments before computing the balance', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 150_000_00 }, { amountCents: 100_000_00 }])).toEqual({
      paidCents: 250_000_00,
      balanceCents: 100_000_00,
    })
  })

  it('allows a balance of zero when paid in full', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 350_000_00 }])).toEqual({
      paidCents: 350_000_00,
      balanceCents: 0,
    })
  })

  it('allows a negative balance when overpaid, rather than clamping', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 400_000_00 }])).toEqual({
      paidCents: 400_000_00,
      balanceCents: -50_000_00,
    })
  })
})

describe('DEFAULT_PAYMENT_TERMS', () => {
  it('is a non-empty sentence', () => {
    expect(DEFAULT_PAYMENT_TERMS.length).toBeGreaterThan(0)
  })
})
