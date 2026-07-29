import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { workAlt } from './workAlt'
import { WORKS } from '@/data/works'

const base = WORKS[1]

describe('workAlt', () => {
  it('falls back to the title alone when nothing else is known', () => {
    expect(workAlt(base)).toBe('Fitted kitchen run by Roomy Creations')
  })

  it('adds materials and district once known', () => {
    expect(workAlt({ ...base, materials: 'matte white board', district: 'Colombo' }))
      .toBe('Fitted kitchen run in matte white board, Colombo, by Roomy Creations')
  })

  it('adds property type when known', () => {
    expect(workAlt({ ...base, propertyType: 'apartment' }))
      .toBe('Fitted kitchen run in an apartment by Roomy Creations')
  })

  it('never emits the TBC placeholder', () => {
    for (const w of WORKS) expect(workAlt(w)).not.toContain('[TBC]')
  })

  it('produces a non-empty string for every record', () => {
    for (const w of WORKS) expect(workAlt(w).length).toBeGreaterThan(10)
  })

  it('uses the correct article for office', () => {
    expect(workAlt({ ...base, propertyType: 'office' }))
      .toBe('Fitted kitchen run in an office by Roomy Creations')
  })
})
