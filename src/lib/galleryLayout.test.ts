import { describe, it, expect } from 'vitest'
import { rowSpan, offsetFor, filterWorks, isEager, COLUMN_UNITS } from './galleryLayout'
import { WORKS } from '@/data/works'

describe('rowSpan', () => {
  it('gives taller spans to taller ratios', () => {
    expect(rowSpan('16:9')).toBeLessThan(rowSpan('3:2'))
    expect(rowSpan('3:2')).toBeLessThan(rowSpan('4:3'))
    expect(rowSpan('4:3')).toBeLessThan(rowSpan('4:5'))
  })

  it('computes span from the column unit width', () => {
    expect(rowSpan('3:2', 60)).toBe(40)
    expect(rowSpan('4:3', 60)).toBe(45)
    expect(rowSpan('16:9', 60)).toBe(34)
    expect(rowSpan('4:5', 60)).toBe(75)
  })

  it('returns whole numbers, since grid spans must be integers', () => {
    for (const r of ['3:2', '4:3', '16:9', '4:5'] as const) {
      expect(Number.isInteger(rowSpan(r))).toBe(true)
    }
  })

  it('defaults to COLUMN_UNITS', () => {
    expect(rowSpan('3:2')).toBe(rowSpan('3:2', COLUMN_UNITS))
  })
})

describe('offsetFor', () => {
  it('disables offsets on a single column, so mobile stays flush', () => {
    for (let i = 0; i < 8; i++) expect(offsetFor(i, 1)).toBe('none')
  })

  it('alternates left and right so the grid reads as woven', () => {
    expect(offsetFor(0, 3)).toBe('none')
    expect(offsetFor(1, 3)).toBe('left')
    expect(offsetFor(2, 3)).toBe('none')
    expect(offsetFor(3, 3)).toBe('right')
  })

  it('repeats on a period of four', () => {
    expect(offsetFor(5, 3)).toBe('left')
    expect(offsetFor(7, 3)).toBe('right')
  })

  it('never offsets more than half the items', () => {
    const offsets = Array.from({ length: 24 }, (_, i) => offsetFor(i, 3))
    expect(offsets.filter((o) => o !== 'none')).toHaveLength(12)
  })
})

describe('filterWorks', () => {
  it('returns everything for "all"', () => {
    expect(filterWorks(WORKS, 'all')).toHaveLength(24)
  })

  it('returns only the matching category', () => {
    const result = filterWorks(WORKS, 'wardrobe')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((w) => w.category === 'wardrobe')).toBe(true)
  })

  it('preserves source order', () => {
    const result = filterWorks(WORKS, 'kitchen')
    const ids = result.map((w) => w.id)
    expect([...ids].sort()).toEqual(ids)
  })

  it('does not mutate the source array', () => {
    filterWorks(WORKS, 'office')
    expect(WORKS).toHaveLength(24)
  })
})

describe('isEager', () => {
  it('eagerly loads the first eight only', () => {
    expect(isEager(0)).toBe(true)
    expect(isEager(7)).toBe(true)
    expect(isEager(8)).toBe(false)
    expect(isEager(23)).toBe(false)
  })
})
