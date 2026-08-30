import { describe, it, expect } from 'vitest'
import { workFormSchema } from './workSchema'

const BASE = {
  title: 'Built-in wardrobe',
  category: 'wardrobe',
  ratio: '3:2',
  materials: '',
  dimensions: '',
  hardware: '',
  propertyType: '',
  district: '',
  year: '',
}

describe('workFormSchema', () => {
  it('requires a non-empty title', () => {
    expect(workFormSchema.safeParse({ ...BASE, title: '' }).success).toBe(false)
  })

  it('rejects a category outside the known filter set', () => {
    expect(workFormSchema.safeParse({ ...BASE, category: 'not-a-category' }).success).toBe(false)
  })

  it('rejects a ratio outside the permitted set', () => {
    expect(workFormSchema.safeParse({ ...BASE, ratio: '1:1' }).success).toBe(false)
  })

  it('accepts every permitted ratio', () => {
    for (const ratio of ['3:2', '4:3', '16:9', '4:5']) {
      expect(workFormSchema.safeParse({ ...BASE, ratio }).success).toBe(true)
    }
  })

  it('turns every blank optional field into null', () => {
    const result = workFormSchema.parse(BASE)
    expect(result.materials).toBeNull()
    expect(result.dimensions).toBeNull()
    expect(result.hardware).toBeNull()
    expect(result.propertyType).toBeNull()
    expect(result.district).toBeNull()
    expect(result.year).toBeNull()
  })

  it('parses a whole-number year', () => {
    expect(workFormSchema.parse({ ...BASE, year: '2026' }).year).toBe(2026)
  })

  it('rejects a non-numeric year', () => {
    expect(workFormSchema.safeParse({ ...BASE, year: 'soon' }).success).toBe(false)
  })

  it('accepts a known property type', () => {
    expect(workFormSchema.parse({ ...BASE, propertyType: 'apartment' }).propertyType).toBe(
      'apartment',
    )
  })

  it('rejects an unknown property type', () => {
    expect(workFormSchema.safeParse({ ...BASE, propertyType: 'castle' }).success).toBe(false)
  })

  it('trims surrounding whitespace on text fields', () => {
    expect(workFormSchema.parse({ ...BASE, materials: '  18mm MDF  ' }).materials).toBe(
      '18mm MDF',
    )
  })
})
