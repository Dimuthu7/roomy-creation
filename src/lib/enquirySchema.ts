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

export const enquirySchema = z.object({
  // min() before max() throughout: for an empty field, the min-length message must be
  // the one a visitor sees, not a length-limit message that makes no sense on nothing.
  name: z.string().trim().min(2, 'Enter your name').max(100, 'Use 100 characters or fewer'),
  phone: z
    .string()
    .trim()
    .max(30, 'Use 30 characters or fewer')
    .refine((v) => v.replace(/\D/g, '').length >= 9, 'Enter a phone number we can call back on'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email address')
    .max(254, 'Use 254 characters or fewer')
    .refine((v) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v), 'That email address is missing a domain'),
  propertyType: z.enum(PROPERTY_TYPES, { message: 'Choose the property type' }),
  needs: z.array(z.enum(NEED_IDS)).min(1, 'Choose at least one thing you need'),
  dimensions: z.string().trim().max(2000, 'Use 2000 characters or fewer').optional().default(''),
  budget: z.string().trim().max(100, 'Use 100 characters or fewer').optional().default(''),
  source: z.string().trim().max(200, 'Use 200 characters or fewer').optional().default(''),
})

export type Enquiry = z.infer<typeof enquirySchema>
