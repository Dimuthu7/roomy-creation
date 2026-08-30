import { describe, it, expect } from 'vitest'
import { siteConfigFormSchema } from './siteConfigSchema'

const BASE = {
  name: 'Roomy Creations',
  url: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  addressLines: '',
  city: '',
  postalCode: '',
  districts: '',
  openingHours: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  mapEmbedUrl: '',
  freeMeasurementVisit: 'unknown',
  yearsInBusiness: '',
  homesFitted: '',
  unitsDelivered: '',
  districtsCovered: '',
}

describe('siteConfigFormSchema', () => {
  it('requires a non-empty name', () => {
    const result = siteConfigFormSchema.safeParse({ ...BASE, name: '' })
    expect(result.success).toBe(false)
  })

  it('turns every blank optional field into null — the form-level TBC', () => {
    const result = siteConfigFormSchema.parse(BASE)
    expect(result.url).toBeNull()
    expect(result.phone).toBeNull()
    expect(result.addressLines).toBeNull()
    expect(result.yearsInBusiness).toBeNull()
    expect(result.freeMeasurementVisit).toBeNull()
  })

  it('trims surrounding whitespace on plain text fields', () => {
    const result = siteConfigFormSchema.parse({ ...BASE, phone: '  +94112345678  ' })
    expect(result.phone).toBe('+94112345678')
  })

  it('splits a lines field on newlines, trimming and dropping blank lines', () => {
    const result = siteConfigFormSchema.parse({
      ...BASE,
      addressLines: '12 Galle Road\n\n  Colombo 3  \n',
    })
    expect(result.addressLines).toEqual(['12 Galle Road', 'Colombo 3'])
  })

  it('parses a whole-number stat field', () => {
    const result = siteConfigFormSchema.parse({ ...BASE, yearsInBusiness: '7' })
    expect(result.yearsInBusiness).toBe(7)
  })

  it('rejects a non-numeric stat field', () => {
    const result = siteConfigFormSchema.safeParse({ ...BASE, yearsInBusiness: 'seven' })
    expect(result.success).toBe(false)
  })

  it('rejects a fractional stat field', () => {
    const result = siteConfigFormSchema.safeParse({ ...BASE, yearsInBusiness: '2.5' })
    expect(result.success).toBe(false)
  })

  it('maps the free-measurement-visit tri-state to null/true/false', () => {
    expect(
      siteConfigFormSchema.parse({ ...BASE, freeMeasurementVisit: 'unknown' })
        .freeMeasurementVisit,
    ).toBeNull()
    expect(
      siteConfigFormSchema.parse({ ...BASE, freeMeasurementVisit: 'true' }).freeMeasurementVisit,
    ).toBe(true)
    expect(
      siteConfigFormSchema.parse({ ...BASE, freeMeasurementVisit: 'false' }).freeMeasurementVisit,
    ).toBe(false)
  })

  it('rejects an invalid free-measurement-visit value', () => {
    const result = siteConfigFormSchema.safeParse({ ...BASE, freeMeasurementVisit: 'maybe' })
    expect(result.success).toBe(false)
  })

  it('passes through a fully filled-in form unchanged in shape', () => {
    const result = siteConfigFormSchema.parse({
      ...BASE,
      phone: '+94112345678',
      email: 'hello@example.lk',
      addressLines: '12 Galle Road',
      city: 'Colombo',
      districts: 'Colombo\nGampaha',
      freeMeasurementVisit: 'true',
      yearsInBusiness: '5',
    })
    expect(result).toMatchObject({
      phone: '+94112345678',
      email: 'hello@example.lk',
      addressLines: ['12 Galle Road'],
      city: 'Colombo',
      districts: ['Colombo', 'Gampaha'],
      freeMeasurementVisit: true,
      yearsInBusiness: 5,
    })
  })
})
