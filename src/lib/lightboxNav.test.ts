import { describe, it, expect } from 'vitest'
import { nextIndex, prevIndex } from './lightboxNav'

describe('nextIndex', () => {
  it('advances', () => expect(nextIndex(0, 24)).toBe(1))
  it('wraps at the end', () => expect(nextIndex(23, 24)).toBe(0))
})

describe('prevIndex', () => {
  it('goes back', () => expect(prevIndex(5, 24)).toBe(4))
  it('wraps at the start', () => expect(prevIndex(0, 24)).toBe(23))
})

describe('edge cases', () => {
  it('stays put in a single-item gallery', () => {
    expect(nextIndex(0, 1)).toBe(0)
    expect(prevIndex(0, 1)).toBe(0)
  })
  it('returns 0 for an empty gallery rather than NaN', () => {
    expect(nextIndex(0, 0)).toBe(0)
    expect(prevIndex(0, 0)).toBe(0)
  })
})

describe('out-of-range current', () => {
  it('never returns a negative index', () => {
    expect(nextIndex(-2, 5)).toBeGreaterThanOrEqual(0)
    expect(prevIndex(-10, 5)).toBeGreaterThanOrEqual(0)
  })

  it('normalises an index below the start', () => {
    expect(prevIndex(-10, 5)).toBe(4)
    expect(nextIndex(-2, 5)).toBe(4)
  })

  it('normalises an index past the end', () => {
    expect(nextIndex(7, 5)).toBe(3)
    expect(prevIndex(7, 5)).toBe(1)
  })
})
