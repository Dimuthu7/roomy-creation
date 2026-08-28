import { describe, it, expect } from 'vitest'
import { WORKS, ALL_WORKS, RATIOS } from './works'
import { CATEGORIES } from './categories'

describe('ALL_WORKS', () => {
  it('has 24 planned records', () => {
    expect(ALL_WORKS).toHaveLength(24)
  })

  it('has unique ids', () => {
    expect(new Set(ALL_WORKS.map((w) => w.id)).size).toBe(24)
  })

  it('points every record at its numbered image slot', () => {
    ALL_WORKS.forEach((w, i) => {
      const n = String(i + 1).padStart(2, '0')
      expect(w.image).toBe(`/work/work-${n}.jpg`)
    })
  })

  it('only uses permitted aspect ratios', () => {
    for (const w of ALL_WORKS) expect(RATIOS).toContain(w.ratio)
  })

  it('is landscape-dominant, as these are rooms not products', () => {
    const portrait = ALL_WORKS.filter((w) => w.ratio === '4:5').length
    expect(portrait).toBeLessThanOrEqual(6)
  })

  it('covers every filter category, once fully delivered', () => {
    const used = new Set(ALL_WORKS.map((w) => w.category))
    for (const c of CATEGORIES.filter((c) => c.id !== 'all')) {
      expect(used).toContain(c.id)
    }
  })

  it('has at least one before image so the compare slider is exercised', () => {
    expect(ALL_WORKS.some((w) => w.beforeImage !== undefined)).toBe(true)
  })
})

// WORKS is what the live site actually shows: only the slots with a photo
// currently sitting in public/work/, as a prefix of the full planned catalog.
describe('WORKS', () => {
  it('is a non-empty prefix of ALL_WORKS', () => {
    expect(WORKS.length).toBeGreaterThan(0)
    expect(WORKS.length).toBeLessThanOrEqual(ALL_WORKS.length)
    expect(WORKS).toEqual(ALL_WORKS.slice(0, WORKS.length))
  })

  it('has unique ids', () => {
    expect(new Set(WORKS.map((w) => w.id)).size).toBe(WORKS.length)
  })
})
