import { describe, it, expect } from 'vitest'
import { TBC, isTBC, resolve, omitTBC, joinDefined } from './tbc'

describe('isTBC', () => {
  it('detects the sentinel', () => {
    expect(isTBC(TBC)).toBe(true)
  })
  it('rejects real values, including empty string and zero', () => {
    expect(isTBC('Colombo')).toBe(false)
    expect(isTBC('')).toBe(false)
    expect(isTBC(0)).toBe(false)
    expect(isTBC(undefined)).toBe(false)
  })
})

describe('resolve', () => {
  it('returns the value when set', () => {
    expect(resolve('18mm', 'unknown')).toBe('18mm')
  })
  it('returns the fallback when TBC', () => {
    expect(resolve(TBC, 'unknown')).toBe('unknown')
  })
})

describe('omitTBC', () => {
  it('drops TBC keys so structured data stays valid', () => {
    expect(omitTBC({ name: 'Roomy Creations', telephone: TBC, city: 'Colombo' }))
      .toEqual({ name: 'Roomy Creations', city: 'Colombo' })
  })
  it('returns an empty object when everything is TBC', () => {
    expect(omitTBC({ a: TBC, b: TBC })).toEqual({})
  })
  it('keeps falsy real values', () => {
    expect(omitTBC({ count: 0, note: '' })).toEqual({ count: 0, note: '' })
  })
})

describe('joinDefined', () => {
  it('joins only the real parts', () => {
    expect(joinDefined(['Built-in wardrobe', TBC, 'Colombo'], ', '))
      .toBe('Built-in wardrobe, Colombo')
  })
  it('returns an empty string when nothing is known', () => {
    expect(joinDefined([TBC, TBC], ', ')).toBe('')
  })
})
