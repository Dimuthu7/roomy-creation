import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { whatsappUrl } from './whatsapp'

describe('whatsappUrl', () => {
  it('builds a wa.me link with an encoded message', () => {
    expect(whatsappUrl('94771234567', 'Hello, I need a wardrobe'))
      .toBe('https://wa.me/94771234567?text=Hello%2C%20I%20need%20a%20wardrobe')
  })

  it('strips spaces, plus signs and dashes from the number', () => {
    expect(whatsappUrl('+94 77 123-4567', 'Hi')).toBe('https://wa.me/94771234567?text=Hi')
  })

  it('returns null when the number is TBC, so no broken link renders', () => {
    expect(whatsappUrl(TBC, 'Hi')).toBeNull()
  })

  it('returns null for a number with no digits', () => {
    expect(whatsappUrl('---', 'Hi')).toBeNull()
  })
})
