import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Position } from './Position'

// D8: the plan gave no copy for this section at all. These six lines (the three
// originally approved-pending, plus three added later as a second beat) are the
// implementer's, not the client's, and are flagged for sign-off in the Task 14 brief
// and docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md — they are
// asserted verbatim here so a future rewrite cannot silently drift them further, the
// same failure that hit Tasks 12 and 13.
describe('Position', () => {
  const LINES = [
    'We make built-in furniture for homes, apartments, hotels and offices.',
    'Every piece is measured on site before anything is cut.',
    'A standard-size unit leaves gaps. A fitted one does not.',
    'Every material is chosen to last, not just to look good on day one.',
    'The same team measures, builds and installs — start to finish.',
    'Fit it once. It will not need fitting again.',
  ]

  it('carries all six lines verbatim, in order', () => {
    const { container } = render(<Position />)
    for (const line of LINES) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    const text = container.textContent ?? ''
    const positions = LINES.map((line) => text.indexOf(line))
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('says nothing else — no invented copy beyond the six approved lines', () => {
    const { container } = render(<Position />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(6)
  })

  it('never uses text-white', () => {
    const { container } = render(<Position />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region. This section is display lines with no heading of its own (a heading
  // over them would be noise, per the brief), so it earns its accessible name from
  // aria-label instead of a visible <h2> (brief §5).
  it('exposes an accessible name on the section, with no visible heading', () => {
    render(<Position />)
    expect(screen.getByRole('region', { name: 'Position' })).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
