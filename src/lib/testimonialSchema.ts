import { z } from 'zod'

const optionalRating = z
  .string()
  .transform((v, ctx) => {
    if (v.trim() === '') return null
    const n = Number(v)
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      ctx.addIssue({ code: 'custom', message: 'Rating must be a whole number from 1 to 5' })
      return z.NEVER
    }
    return n
  })
  .nullable()

const recommendedField = z
  .enum(['yes', 'no', ''])
  .transform((v) => (v === 'yes' ? true : v === 'no' ? false : null))

export const testimonialFormSchema = z.object({
  authorName: z.string().trim().min(1, 'Name is required'),
  reviewText: z.string().trim().min(1, 'Review text is required'),
  rating: optionalRating,
  recommended: recommendedField,
})

export type TestimonialFormInput = z.infer<typeof testimonialFormSchema>
