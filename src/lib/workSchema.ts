import { z } from 'zod'
import { RATIOS } from '@/data/workTypes'
import { CATEGORIES } from '@/data/categories'

const WORK_CATEGORY_IDS = CATEGORIES.filter((c) => c.id !== 'all').map((c) => c.id) as [
  string,
  ...string[],
]

const PROPERTY_TYPES = ['house', 'apartment', 'hotel', 'office'] as const

const optionalText = z
  .string()
  .transform((v) => (v.trim() === '' ? null : v.trim()))
  .nullable()

const optionalYear = z
  .string()
  .transform((v, ctx) => {
    if (v.trim() === '') return null
    const n = Number(v)
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      ctx.addIssue({ code: 'custom', message: 'Must be a whole number' })
      return z.NEVER
    }
    return n
  })
  .nullable()

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB

export const workFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  category: z.enum(WORK_CATEGORY_IDS),
  ratio: z.enum([...RATIOS]),
  materials: optionalText,
  dimensions: optionalText,
  hardware: optionalText,
  propertyType: z
    .string()
    .transform((v) => (v.trim() === '' ? null : v.trim()))
    .pipe(z.enum(PROPERTY_TYPES).nullable()),
  district: optionalText,
  year: optionalYear,
})

export type WorkFormInput = z.infer<typeof workFormSchema>
