import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { buildLocalBusinessSchema } from './schema'
import { SITE } from '@/data/site'

const filled = {
  ...SITE,
  phone: '+94112345678',
  email: 'hello@example.lk',
  city: 'Colombo',
  addressLines: ['12 Example Road'],
  postalCode: '00300',
  openingHours: ['Mo-Fr 09:00-18:00'],
}

describe('buildLocalBusinessSchema', () => {
  it('always emits the LocalBusiness type and name', () => {
    const s = buildLocalBusinessSchema(SITE)
    expect(s['@type']).toBe('LocalBusiness')
    expect(s.name).toBe('Roomy Creations')
  })

  it('omits TBC fields rather than emitting the placeholder', () => {
    const s = buildLocalBusinessSchema({ ...SITE, phone: TBC, email: TBC })
    expect(JSON.stringify(s)).not.toContain('[TBC]')
    expect(s.telephone).toBeUndefined()
  })

  it('includes fields once they are filled in', () => {
    const s = buildLocalBusinessSchema(filled)
    expect(s.telephone).toBe('+94112345678')
    expect(s.email).toBe('hello@example.lk')
    expect(s.openingHours).toEqual(['Mo-Fr 09:00-18:00'])
  })

  it('builds a PostalAddress only when address parts exist', () => {
    expect(buildLocalBusinessSchema({ ...SITE, city: TBC, addressLines: TBC }).address)
      .toBeUndefined()
    const addr = buildLocalBusinessSchema(filled).address as Record<string, unknown>
    expect(addr['@type']).toBe('PostalAddress')
    expect(addr.addressLocality).toBe('Colombo')
    expect(addr.addressCountry).toBe('LK')
  })

  it('never contains a price or offer, since this is not a shop', () => {
    const json = JSON.stringify(buildLocalBusinessSchema(filled))
    expect(json).not.toContain('priceRange')
    expect(json).not.toContain('Offer')
  })
})
