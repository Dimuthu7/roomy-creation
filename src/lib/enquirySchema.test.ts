import { describe, it, expect } from 'vitest'
import { enquirySchema } from './enquirySchema'

const valid = {
  name: 'Nimal',
  phone: '0771234567',
  email: 'nimal@example.lk',
  propertyType: 'apartment',
  needs: ['wardrobe'],
  dimensions: 'not sure yet',
  budget: '',
  source: 'instagram',
}

describe('enquirySchema', () => {
  it('accepts a complete enquiry', () => {
    expect(enquirySchema.safeParse(valid).success).toBe(true)
  })

  it('requires at least one need, since a blank enquiry is unactionable', () => {
    const r = enquirySchema.safeParse({ ...valid, needs: [] })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('Choose at least one thing you need')
    }
  })

  it('rejects a malformed email with a specific, non-apologising message', () => {
    const r = enquirySchema.safeParse({ ...valid, email: 'nimal@' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('That email address is missing a domain')
    }
  })

  it('requires a phone number of at least nine digits', () => {
    expect(enquirySchema.safeParse({ ...valid, phone: '0771' }).success).toBe(false)
  })

  it('allows an empty budget, which is optional', () => {
    expect(enquirySchema.safeParse({ ...valid, budget: '' }).success).toBe(true)
  })

  it('rejects an unknown property type', () => {
    expect(enquirySchema.safeParse({ ...valid, propertyType: 'castle' }).success).toBe(false)
  })

  it('phrases the property type error for a person, not a developer', () => {
    const r = enquirySchema.safeParse({ ...valid, propertyType: 'castle' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('Choose the property type')
    }
  })

  it('has no error message containing an exclamation mark or an apology', () => {
    const r = enquirySchema.safeParse({ name: '', phone: '', email: '', propertyType: 'x', needs: [] })
    if (!r.success) {
      for (const issue of r.error.issues) {
        expect(issue.message).not.toContain('!')
        expect(issue.message.toLowerCase()).not.toContain('sorry')
      }
    }
  })
})
