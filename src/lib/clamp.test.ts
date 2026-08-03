import { describe, it, expect } from 'vitest'
import { clampPercent } from './clamp'

describe('clampPercent', () => {
  it('passes through values in range', () => expect(clampPercent(42)).toBe(42))
  it('clamps below zero', () => expect(clampPercent(-10)).toBe(0))
  it('clamps above one hundred', () => expect(clampPercent(140)).toBe(100))
  it('handles the exact bounds', () => {
    expect(clampPercent(0)).toBe(0)
    expect(clampPercent(100)).toBe(100)
  })
  it('returns 50 for NaN rather than breaking the layout', () => {
    expect(clampPercent(NaN)).toBe(50)
  })
  it('returns 50 for Infinity, which is what a zero-width frame produces', () => {
    expect(clampPercent(Infinity)).toBe(50)
    expect(clampPercent(-Infinity)).toBe(50)
  })
})
