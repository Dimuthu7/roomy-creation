import { describe, it, expect } from 'vitest'
import { activeScrollStep } from './scrollProgress'

describe('activeScrollStep', () => {
  it('stays on the first step before the track reaches the top of the viewport', () => {
    expect(activeScrollStep(500, 4000, 800, 6)).toBe(0)
  })

  it('lands on the last step once scrolled fully past the pinned track', () => {
    expect(activeScrollStep(-4000, 4000, 800, 6)).toBe(5)
  })

  it('splits the pinned range evenly across the steps', () => {
    const trackHeight = 4200
    const viewportHeight = 700 // scrollable = 3500, ~583.3 per step
    expect(activeScrollStep(0, trackHeight, viewportHeight, 6)).toBe(0)
    expect(activeScrollStep(-600, trackHeight, viewportHeight, 6)).toBe(1)
    expect(activeScrollStep(-1750, trackHeight, viewportHeight, 6)).toBe(3)
  })

  it('never returns an index outside the step range', () => {
    for (const top of [-999999, -1, 0, 1, 999999]) {
      const index = activeScrollStep(top, 4000, 800, 6)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(6)
    }
  })

  it('survives non-finite input', () => {
    expect(activeScrollStep(Number.NaN, 4000, 800, 6)).toBe(0)
  })

  it('treats a track no taller than the viewport as a single, un-scrollable step', () => {
    expect(activeScrollStep(-9999, 400, 800, 6)).toBe(0)
    expect(activeScrollStep(0, 800, 800, 6)).toBe(0)
  })
})
