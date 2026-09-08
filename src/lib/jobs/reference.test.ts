import { describe, it, expect } from 'vitest'
import { formatInvoiceNumber, formatJobRef, formatWarrantyNumber, JOB_REF_SEED } from './reference'

describe('formatJobRef', () => {
  it('pads to five digits behind the RC prefix', () => {
    expect(formatJobRef(195)).toBe('RC00195')
  })

  it('matches the numbering of the existing paper documents', () => {
    expect(formatJobRef(188)).toBe('RC00188')
    expect(formatJobRef(194)).toBe('RC00194')
  })

  it('pads a single digit', () => {
    expect(formatJobRef(1)).toBe('RC00001')
  })

  it('grows past the padding width rather than truncating', () => {
    expect(formatJobRef(123456)).toBe('RC123456')
  })

  it('sorts lexicographically in the same order as numerically within the pad width', () => {
    const sorted = [195, 1000, 99].map(formatJobRef).sort()
    expect(sorted).toEqual(['RC00099', 'RC00195', 'RC01000'])
  })
})

describe('JOB_REF_SEED', () => {
  it('is 194 so the first system-created job is RC00195', () => {
    expect(JOB_REF_SEED).toBe(194)
    expect(formatJobRef(JOB_REF_SEED + 1)).toBe('RC00195')
  })
})

describe('other document series', () => {
  it('formats invoice numbers on their own series', () => {
    expect(formatInvoiceNumber(1)).toBe('INV00001')
  })

  it('formats warranty card numbers on their own series', () => {
    expect(formatWarrantyNumber(1)).toBe('WC00001')
  })
})
