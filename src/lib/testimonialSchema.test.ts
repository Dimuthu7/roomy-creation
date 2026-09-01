import { describe, it, expect } from 'vitest'
import { testimonialFormSchema } from './testimonialSchema'

const BASE = {
  authorName: 'Nimal Perera',
  reviewText: 'Fantastic work on our wardrobe.',
  rating: '',
  recommended: '',
}

describe('testimonialFormSchema', () => {
  it('requires a non-empty author name', () => {
    expect(testimonialFormSchema.safeParse({ ...BASE, authorName: '' }).success).toBe(false)
  })

  it('requires a non-empty review text', () => {
    expect(testimonialFormSchema.safeParse({ ...BASE, reviewText: '' }).success).toBe(false)
  })

  it('trims surrounding whitespace on the author name and review text', () => {
    const result = testimonialFormSchema.parse({
      ...BASE,
      authorName: '  Nimal Perera  ',
      reviewText: '  Fantastic work.  ',
    })
    expect(result.authorName).toBe('Nimal Perera')
    expect(result.reviewText).toBe('Fantastic work.')
  })

  it('turns a blank rating into null', () => {
    expect(testimonialFormSchema.parse({ ...BASE, rating: '' }).rating).toBeNull()
  })

  it('parses a whole-number rating from 1 to 5', () => {
    expect(testimonialFormSchema.parse({ ...BASE, rating: '5' }).rating).toBe(5)
  })

  it('rejects a rating below 1', () => {
    expect(testimonialFormSchema.safeParse({ ...BASE, rating: '0' }).success).toBe(false)
  })

  it('rejects a rating above 5', () => {
    expect(testimonialFormSchema.safeParse({ ...BASE, rating: '6' }).success).toBe(false)
  })

  it('rejects a non-numeric rating', () => {
    expect(testimonialFormSchema.safeParse({ ...BASE, rating: 'great' }).success).toBe(false)
  })

  it('maps recommended "yes" to true and "no" to false', () => {
    expect(testimonialFormSchema.parse({ ...BASE, recommended: 'yes' }).recommended).toBe(true)
    expect(testimonialFormSchema.parse({ ...BASE, recommended: 'no' }).recommended).toBe(false)
  })

  it('maps a blank recommended value to null', () => {
    expect(testimonialFormSchema.parse({ ...BASE, recommended: '' }).recommended).toBeNull()
  })

  it('rejects an unrecognised recommended value', () => {
    expect(testimonialFormSchema.safeParse({ ...BASE, recommended: 'maybe' }).success).toBe(false)
  })
})
