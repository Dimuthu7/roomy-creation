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

const NEED_IDS = NEED_OPTIONS.map((n) => n.id) as unknown as [string, ...string[]]

export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 9, 'Enter a phone number we can call back on'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email address')
    .refine((v) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v), 'That email address is missing a domain'),
  propertyType: z.enum(PROPERTY_TYPES, { message: 'Choose the property type' }),
  needs: z.array(z.enum(NEED_IDS)).min(1, 'Choose at least one thing you need'),
  dimensions: z.string().trim().optional().default(''),
  budget: z.string().trim().optional().default(''),
  source: z.string().trim().optional().default(''),
})

export type Enquiry = z.infer<typeof enquirySchema>
