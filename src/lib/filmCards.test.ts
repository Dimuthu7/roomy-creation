import { describe, it, expect } from 'vitest'
import { cardIndexAt } from './filmCards'

const starts = [0, 4.5, 9.2, 13.8]

describe('cardIndexAt', () => {
  it('shows the first card from the start', () => {
    expect(cardIndexAt(0, starts)).toBe(0)
    expect(cardIndexAt(4.49, starts)).toBe(0)
  })

  it('switches exactly on the clip boundary', () => {
    expect(cardIndexAt(4.5, starts)).toBe(1)
    expect(cardIndexAt(9.2, starts)).toBe(2)
    expect(cardIndexAt(13.8, starts)).toBe(3)
  })

  it('holds the last card to the end of the file', () => {
    expect(cardIndexAt(18, starts)).toBe(3)
  })

  it('clamps negative or NaN time to the first card', () => {
    expect(cardIndexAt(-1, starts)).toBe(0)
    expect(cardIndexAt(NaN, starts)).toBe(0)
  })

  it('supports a three-cut film, if a figure is unknown and a row is dropped', () => {
    expect(cardIndexAt(11, [0, 5, 10])).toBe(2)
  })

  it('returns 0 when there are no clips', () => {
    expect(cardIndexAt(5, [])).toBe(0)
  })
})
