import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { workAlt } from './workAlt'
import { WORKS_FIXTURE as WORKS } from '@/test/fixtures'

const base = WORKS[1]

// Shape: {title}[ in {article}][ in {district}][, {materials},] by Roomy Creations
describe('workAlt', () => {
  it('falls back to the title alone when nothing else is known', () => {
    expect(workAlt(base)).toBe('Fitted kitchen run by Roomy Creations')
  })

  it('reads place first, then spec, when everything is known', () => {
    expect(workAlt({
      ...base, materials: '18mm board', propertyType: 'apartment', district: 'Colombo',
    })).toBe('Fitted kitchen run in an apartment in Colombo, 18mm board, by Roomy Creations')
  })

  it('adds property type when known', () => {
    expect(workAlt({ ...base, propertyType: 'apartment' }))
      .toBe('Fitted kitchen run in an apartment by Roomy Creations')
  })

  it('keeps the preposition when district is the only known field', () => {
    expect(workAlt({ ...base, district: 'Colombo' }))
      .toBe('Fitted kitchen run in Colombo by Roomy Creations')
  })

  it('sets materials off as an appositive when it is the only known field', () => {
    expect(workAlt({ ...base, materials: 'matte white board' }))
      .toBe('Fitted kitchen run, matte white board, by Roomy Creations')
  })

  it('joins property type and district into one phrase, with no doubled preposition', () => {
    expect(workAlt({ ...base, propertyType: 'apartment', district: 'Colombo' }))
      .toBe('Fitted kitchen run in an apartment in Colombo by Roomy Creations')
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
