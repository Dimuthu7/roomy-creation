import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Position } from './Position'

// D8: the plan gave no copy for this section at all. These three lines are the
// implementer's, not the client's, and are flagged for sign-off in the Task 14 brief —
// they are asserted verbatim here so a future rewrite cannot silently drift them
// further, the same failure that hit Tasks 12 and 13.
describe('Position', () => {
  it('carries the three approved lines verbatim, in order', () => {
    const { container } = render(<Position />)
    const lines = [
      'We make built-in furniture for homes, apartments, hotels and offices.',
      'Every piece is measured on site before anything is cut.',
      'A standard-size unit leaves gaps. A fitted one does not.',
    ]
    for (const line of lines) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    const text = container.textContent ?? ''
    const positions = lines.map((line) => text.indexOf(line))
    expect(positions[1]).toBeGreaterThan(positions[0])
    expect(positions[2]).toBeGreaterThan(positions[1])
  })

  it('says nothing else — no invented copy beyond the three approved lines', () => {
    const { container } = render(<Position />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(3)
  })

  it('never uses text-white', () => {
    const { container } = render(<Position />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })
})
