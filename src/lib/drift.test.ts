import { describe, it, expect } from 'vitest'
import { driftX } from './drift'

describe('driftX', () => {
  it('stays within its amplitude for any scroll position', () => {
    for (const y of [0, 1, 137, 199, 200, 201, 5000, 123456]) {
      expect(Math.abs(driftX(y, 60))).toBeLessThanOrEqual(60)
    }
  })

  // The first implementation was `(scrollY % 200) - 100`, which snaps from +99 to -100
  // the instant scrollY crosses 200 — a 199px jump every 200px of scroll, on every
  // wrap, for the whole page. That reads as a glitch, not a drift. Continuity across
  // the old wrap points is the property that was actually missing.
  it('never jumps between adjacent scroll positions', () => {
    let previous = driftX(0, 60)
    for (let y = 1; y <= 2000; y++) {
      const current = driftX(y, 60)
      expect(Math.abs(current - previous)).toBeLessThan(2)
      previous = current
    }
  })

  it('actually moves rather than sitting still', () => {
    const samples = [0, 100, 200, 300, 400].map((y) => driftX(y, 60))
    expect(new Set(samples).size).toBeGreaterThan(1)
  })

  it('survives the values a browser can genuinely produce', () => {
    // Safari reports a negative scrollY while rubber-banding at the top of the page.
    expect(Number.isFinite(driftX(-120, 60))).toBe(true)
    expect(driftX(Number.NaN, 60)).toBe(0)
  })
})
