import { describe, it, expect } from 'vitest'
import { formatCents, parseMoneyToCents } from './money'

describe('parseMoneyToCents', () => {
  it('parses a plain whole number', () => {
    expect(parseMoneyToCents('368500')).toBe(36850000)
  })

  it('parses a grouped amount as typed on the existing documents', () => {
    expect(parseMoneyToCents('368,500.00')).toBe(36850000)
  })

  it('parses a single decimal place as tenths, not hundredths', () => {
    expect(parseMoneyToCents('10.5')).toBe(1050)
  })

  it('ignores surrounding and internal whitespace', () => {
    expect(parseMoneyToCents(' 22 500.00 ')).toBe(2250000)
  })

  it('returns null for an empty string', () => {
    expect(parseMoneyToCents('')).toBeNull()
  })

  it('returns null for more than two decimal places', () => {
    expect(parseMoneyToCents('10.555')).toBeNull()
  })

  it('returns null for non-numeric text', () => {
    expect(parseMoneyToCents('free')).toBeNull()
  })

  it('returns null for a negative amount', () => {
    expect(parseMoneyToCents('-100')).toBeNull()
  })
})

describe('formatCents', () => {
  it('formats with thousands separators and two decimals', () => {
    expect(formatCents(36850000)).toBe('368,500.00')
  })

  it('keeps a non-zero cents remainder', () => {
    expect(formatCents(2250050)).toBe('22,500.50')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('0.00')
  })

  it('formats an amount below one unit', () => {
    expect(formatCents(5)).toBe('0.05')
  })

  it('formats a negative amount', () => {
    expect(formatCents(-3000000)).toBe('-30,000.00')
  })

  it('round-trips through parseMoneyToCents', () => {
    expect(parseMoneyToCents(formatCents(43000000))).toBe(43000000)
  })
})
