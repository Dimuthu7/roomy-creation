import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HOW_WE_WORK_ICONS } from './HowWeWorkIcons'

const KEYS = ['enquiry', 'measurement', 'drawings', 'manufacture', 'installation'] as const

describe('HowWeWorkIcons', () => {
  it('exposes exactly the five step icons, each rendering a decorative svg', () => {
    expect(Object.keys(HOW_WE_WORK_ICONS).sort()).toEqual([...KEYS].sort())
    for (const key of KEYS) {
      const Icon = HOW_WE_WORK_ICONS[key]
      const { container } = render(<Icon />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('applies a passed className to the svg element, for size/color control per usage site', () => {
    const { container } = render(<HOW_WE_WORK_ICONS.measurement className="h-8 w-8 text-navy" />)
    expect(container.querySelector('svg')).toHaveClass('h-8', 'w-8', 'text-navy')
  })
})
