import { z } from 'zod'

export const PROPERTY_TYPES = ['house', 'apartment', 'hotel', 'office', 'other'] as const

export const NEED_OPTIONS = [
  { id: 'seating', label: 'Sofa & seating' },
  { id: 'kitchen', label: 'Kitchen / pantry' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'living', label: 'TV & storage' },
  { id: 'office', label: 'Office' },
  { id: 'other', label: 'Other' },
] as const

export type NeedId = (typeof NEED_OPTIONS)[number]['id']
const NEED_IDS = NEED_OPTIONS.map((n) => n.id) as [NeedId, ...NeedId[]]

export const SOURCE_OPTIONS = [
  { id: 'webPortal', label: 'Web Portal' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'recommendation', label: 'Personal recommendation' },
  { id: 'other', label: 'Other' },
] as const

export type SourceId = (typeof SOURCE_OPTIONS)[number]['id']
const SOURCE_IDS = SOURCE_OPTIONS.map((s) => s.id) as [SourceId, ...SourceId[]]

export const enquirySchema = z
  .object({
    // min() before max() throughout: for an empty field, the min-length message must be
    // the one a visitor sees, not a length-limit message that makes no sense on nothing.
    name: z.string().trim().min(2, 'Enter your name').max(100, 'Use 100 characters or fewer'),
    phone: z
      .string()
      .trim()
      .max(30, 'Use 30 characters or fewer')
      .refine((v) => v.replace(/\D/g, '').length >= 9, 'Enter a phone number we can call back on'),
    // Optional: phone alone is enough to follow up on. When an email is given at all,
    // it still has to look like one.
    email: z
      .string()
      .trim()
      .max(254, 'Use 254 characters or fewer')
      .refine(
        (v) => v === '' || /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v),
        'That email address is missing a domain',
      )
      .optional()
      .default(''),
    propertyType: z.enum(PROPERTY_TYPES, { message: 'Choose the property type' }),
    needs: z.array(z.enum(NEED_IDS)).min(1, 'Choose at least one thing you need'),
    // Only meaningful when `needs` includes 'other' — enforced below, since a plain
    // `min(1)` here would also fire when 'other' was never selected.
    needsOther: z.string().trim().max(200, 'Use 200 characters or fewer').optional().default(''),
    dimensions: z.string().trim().max(2000, 'Use 2000 characters or fewer').optional().default(''),
    budget: z.string().trim().max(100, 'Use 100 characters or fewer').optional().default(''),
    source: z.enum(SOURCE_IDS, { message: 'Choose how you found us' }),
    remarks: z.string().trim().max(2000, 'Use 2000 characters or fewer').optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.needs.includes('other') && data.needsOther === '') {
      ctx.addIssue({ code: 'custom', path: ['needsOther'], message: 'Tell us what else you need' })
    }
  })

export type Enquiry = z.infer<typeof enquirySchema>
