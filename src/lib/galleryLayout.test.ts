import { describe, it, expect } from 'vitest'
import { filterWorks, isEager } from './galleryLayout'
import { ALL_WORKS_FIXTURE as WORKS } from '@/test/fixtures'

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
