import { describe, it, expect } from 'vitest'
import { enquirySchema, type Enquiry } from './enquirySchema'

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

  it('names the field when the name is missing', () => {
    const r = enquirySchema.safeParse({ ...valid, name: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('Enter your name')
    }
  })

  it('says why the phone number matters', () => {
    const r = enquirySchema.safeParse({ ...valid, phone: '0771' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('Enter a phone number we can call back on')
    }
  })

  it('asks for an email when the field is blank', () => {
    const r = enquirySchema.safeParse({ ...valid, email: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const hasMinMessage = r.error.issues.some((issue) => issue.message === 'Enter an email address')
      expect(hasMinMessage).toBe(true)
    }
  })

  it('fills in an absent budget rather than rejecting it', () => {
    const withoutBudget = { ...valid, budget: undefined }
    const r = enquirySchema.safeParse(withoutBudget)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.budget).toBe('')
  })
})

// D8: an endpoint that sends email with no CAPTCHA has field-length bounds as its only
// defence against an abuse script. The probe measured a 200,000-character name as
// accepted before this change.
describe('field length bounds', () => {
  it('rejects a name over 100 characters', () => {
    const r = enquirySchema.safeParse({ ...valid, name: 'a'.repeat(101) })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Use 100 characters or fewer')
  })

  it('accepts a name at exactly the 100 character limit', () => {
    expect(enquirySchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success).toBe(true)
  })

  it('rejects a phone number over 30 characters', () => {
    const r = enquirySchema.safeParse({ ...valid, phone: '0'.repeat(31) })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Use 30 characters or fewer')
  })

  it('rejects an email over 254 characters', () => {
    const long = `${'a'.repeat(250)}@a.lk`
    const r = enquirySchema.safeParse({ ...valid, email: long })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Use 254 characters or fewer')
  })

  it('rejects room dimensions over 2000 characters', () => {
    const r = enquirySchema.safeParse({ ...valid, dimensions: 'a'.repeat(2001) })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Use 2000 characters or fewer')
  })

  it('rejects a budget string over 100 characters', () => {
    const r = enquirySchema.safeParse({ ...valid, budget: 'a'.repeat(101) })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Use 100 characters or fewer')
  })

  it('rejects a source string over 200 characters', () => {
    const r = enquirySchema.safeParse({ ...valid, source: 'a'.repeat(201) })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Use 200 characters or fewer')
  })

  it('still asks for a name first when the field is empty, ahead of any max-length concern', () => {
    const r = enquirySchema.safeParse({ ...valid, name: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Enter your name')
  })
})

// @ts-expect-error - a need id outside NEED_OPTIONS must not type-check
const _rejectsUnknownNeedId: Enquiry['needs'] = ['not-a-real-need']
void _rejectsUnknownNeedId
