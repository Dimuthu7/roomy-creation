import { describe, it, expect } from 'vitest'
import { BRAND, contrastRatio } from './brand'

describe('BRAND', () => {
  it('holds the exact sampled hex values', () => {
    expect(BRAND).toEqual({
      navy: '#023048',
      yellow: '#F5CA4A',
      teal: '#1FA2C0',
      sky: '#8FCBE7',
      paper: '#F1F5F8',
    })
  })
})

describe('contrastRatio', () => {
  it('matches the documented ratios for text pairs', () => {
    expect(contrastRatio(BRAND.yellow, BRAND.navy)).toBeCloseTo(8.8, 1)
    expect(contrastRatio(BRAND.sky, BRAND.navy)).toBeCloseTo(7.8, 1)
    expect(contrastRatio(BRAND.teal, BRAND.navy)).toBeCloseTo(4.6, 1)
  })

  it('confirms teal on paper is below AA large-text minimum', () => {
    expect(contrastRatio(BRAND.teal, BRAND.paper)).toBeLessThan(3)
  })

  it('confirms navy on paper is safe for focus rings', () => {
    expect(contrastRatio(BRAND.navy, BRAND.paper)).toBeGreaterThan(7)
  })

  it('is symmetric', () => {
    expect(contrastRatio(BRAND.navy, BRAND.yellow))
      .toBeCloseTo(contrastRatio(BRAND.yellow, BRAND.navy), 5)
  })
})
