import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { getActiveSocials } from './socials'

describe('getActiveSocials', () => {
  it('returns Facebook, Instagram and TikTok in that order when all are set', () => {
    expect(
      getActiveSocials({
        facebook: 'https://facebook.com/roomy',
        instagram: 'https://instagram.com/roomy',
        tiktok: 'https://tiktok.com/@roomy',
      }),
    ).toEqual([
      { label: 'Facebook', href: 'https://facebook.com/roomy' },
      { label: 'Instagram', href: 'https://instagram.com/roomy' },
      { label: 'TikTok', href: 'https://tiktok.com/@roomy' },
    ])
  })

  it('omits any handle still set to [TBC]', () => {
    expect(
      getActiveSocials({
        facebook: TBC,
        instagram: 'https://instagram.com/roomy',
        tiktok: TBC,
      }),
    ).toEqual([{ label: 'Instagram', href: 'https://instagram.com/roomy' }])
  })

  it('returns an empty array when every handle is [TBC]', () => {
    expect(getActiveSocials({ facebook: TBC, instagram: TBC, tiktok: TBC })).toEqual([])
  })
})
