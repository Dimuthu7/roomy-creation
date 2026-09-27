import { describe, it, expect } from 'vitest'
import { categoryBreakdown } from './totals'

describe('categoryBreakdown', () => {
  it('returns every category with a zero total when there is no spend', () => {
    const { perCategory, totalCents } = categoryBreakdown([])
    expect(perCategory.map((c) => c.category)).toEqual(['material', 'salary', 'business_capital', 'transport'])
    expect(perCategory.every((c) => c.totalCents === 0)).toBe(true)
    expect(totalCents).toBe(0)
  })

  it('fills in the categories that have spend and zeroes the rest', () => {
    const { perCategory, totalCents } = categoryBreakdown([
      { category: 'salary', totalCents: 14_500_000 },
      { category: 'material', totalCents: 38_650_000 },
    ])
    expect(perCategory).toEqual([
      { category: 'material', label: 'Material', totalCents: 38_650_000 },
      { category: 'salary', label: 'Salaries', totalCents: 14_500_000 },
      { category: 'business_capital', label: 'Business Capital', totalCents: 0 },
      { category: 'transport', label: 'Transport', totalCents: 0 },
    ])
    expect(totalCents).toBe(53_150_000)
  })

  it('keeps registry order regardless of the order rows arrive in', () => {
    const { perCategory } = categoryBreakdown([
      { category: 'transport', totalCents: 1 },
      { category: 'material', totalCents: 2 },
    ])
    expect(perCategory.map((c) => c.category)).toEqual(['material', 'salary', 'business_capital', 'transport'])
  })

  it('sums duplicate rows for the same category', () => {
    const { perCategory, totalCents } = categoryBreakdown([
      { category: 'transport', totalCents: 100 },
      { category: 'transport', totalCents: 250 },
    ])
    expect(perCategory.find((c) => c.category === 'transport')?.totalCents).toBe(350)
    expect(totalCents).toBe(350)
  })

  // A category removed from the registry leaves its historical rows in the table.
  // They must not appear under a made-up label, and must not silently vanish from
  // the grand total either — so they are excluded from both, consistently.
  it('ignores a category the registry no longer knows', () => {
    const { perCategory, totalCents } = categoryBreakdown([
      { category: 'material', totalCents: 500 },
      { category: 'crypto', totalCents: 999 },
    ])
    expect(perCategory).toHaveLength(4)
    expect(totalCents).toBe(500)
  })
})
