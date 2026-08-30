import { describe, it, expect } from 'vitest'
import { aspectClass } from './aspect'
import { RATIOS } from '@/data/workTypes'

describe('aspectClass', () => {
  it('maps every ratio to a distinct, non-empty class', () => {
    const classes = RATIOS.map((r) => aspectClass(r))
    expect(new Set(classes).size).toBe(RATIOS.length)
    for (const c of classes) expect(c.length).toBeGreaterThan(0)
  })

  it('returns a literal class, not an interpolated one Tailwind cannot scan', () => {
    for (const r of RATIOS) expect(aspectClass(r)).not.toContain('${')
  })
})
