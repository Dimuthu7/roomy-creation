import { describe, it, expect } from 'vitest'
import { WORKS, RATIOS } from './works'
import { CATEGORIES } from './categories'

describe('WORKS', () => {
  it('has 24 records', () => {
    expect(WORKS).toHaveLength(24)
  })

  it('has unique ids', () => {
    expect(new Set(WORKS.map((w) => w.id)).size).toBe(24)
  })

  it('points every record at its numbered image slot', () => {
    WORKS.forEach((w, i) => {
      const n = String(i + 1).padStart(2, '0')
      expect(w.image).toBe(`/work/work-${n}.jpg`)
    })
  })

  it('only uses permitted aspect ratios', () => {
    for (const w of WORKS) expect(RATIOS).toContain(w.ratio)
  })

  it('is landscape-dominant, as these are rooms not products', () => {
    const portrait = WORKS.filter((w) => w.ratio === '4:5').length
    expect(portrait).toBeLessThanOrEqual(6)
  })

  it('covers every filter category', () => {
    const used = new Set(WORKS.map((w) => w.category))
    for (const c of CATEGORIES.filter((c) => c.id !== 'all')) {
      expect(used).toContain(c.id)
    }
  })

  it('has at least one before image so the compare slider is exercised', () => {
    expect(WORKS.some((w) => w.beforeImage !== undefined)).toBe(true)
  })
})
