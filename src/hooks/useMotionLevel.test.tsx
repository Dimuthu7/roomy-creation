import { describe, it, expect } from 'vitest'
import { resolveMotionLevel, MOBILE_MAX } from './useMotionLevel'

describe('resolveMotionLevel', () => {
  it('returns reduced whenever the user asks for reduced motion, at any width', () => {
    expect(resolveMotionLevel(true, 1440)).toBe('reduced')
    expect(resolveMotionLevel(true, 375)).toBe('reduced')
  })

  it('returns mobile on small screens', () => {
    expect(resolveMotionLevel(false, 375)).toBe('mobile')
    expect(resolveMotionLevel(false, MOBILE_MAX)).toBe('mobile')
  })

  it('returns full on desktop', () => {
    expect(resolveMotionLevel(false, MOBILE_MAX + 1)).toBe('full')
    expect(resolveMotionLevel(false, 1440)).toBe('full')
  })

  it('treats reduced-motion as higher priority than viewport width', () => {
    expect(resolveMotionLevel(true, MOBILE_MAX + 1)).not.toBe('full')
  })
})
