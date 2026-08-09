import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { Position } from './Position'

// D8: the plan gave no copy for this section at all. These six lines (the three
// originally approved-pending, plus three added later as a second beat) are the
// implementer's, not the client's, and are flagged for sign-off in the Task 14 brief
// and docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md — they are
// asserted verbatim here so a future rewrite cannot silently drift them further, the
// same failure that hit Tasks 12 and 13.
const LINES = [
  'We make built-in furniture for homes, apartments, hotels and offices.',
  'Every piece is measured on site before anything is cut.',
  'A standard-size unit leaves gaps. A fitted one does not.',
  'Every material is chosen to last, not just to look good on day one.',
  'The same team measures, builds and installs — start to finish.',
  'Fit it once. It will not need fitting again.',
]

describe('Position', () => {
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
    expect(container.querySelectorAll('p')).toHaveLength(6)
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

  describe('at full motion (pinned scroll reveal)', () => {
    // Point 0 has both a main and a sub line — they must load together on the very
    // first render, not as two separate scroll steps. Points 1-3 wait for scroll.
    it('shows only the first point (main + its sub) on initial render — the rest wait for scroll', () => {
      const { container } = render(<Position />)
      const paragraphs = [...container.querySelectorAll('p')] as HTMLElement[]
      expect(paragraphs).toHaveLength(6)
      expect(paragraphs[0].style.opacity).toBe('1') // point 0 main
      expect(paragraphs[1].style.opacity).toBe('1') // point 0 sub
      for (const p of paragraphs.slice(2)) {
        expect(p.style.opacity).toBe('0')
      }
    })

    it('pins the section for a scroll distance proportional to the point count', () => {
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      // STEP_VH (55) * 4 points
      expect(section.style.height).toBe('220vh')
      expect(section.querySelector('.sticky')).not.toBeNull()
    })

    it('advances which point is visible as the section scrolls past', async () => {
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      section.getBoundingClientRect = () =>
        ({
          top: -2000,
          height: 3300,
          bottom: 1300,
          left: 0,
          right: 0,
          x: 0,
          y: -2000,
          width: 0,
          toJSON() {},
        }) as DOMRect
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      fireEvent.scroll(window)
      await waitFor(() => {
        const paragraphs = [...container.querySelectorAll('p')] as HTMLElement[]
        const activeIndex = paragraphs.findIndex((p) => p.style.opacity === '1')
        expect(activeIndex).toBeGreaterThan(0)
      })
    })
  })

  describe('under reduced motion or on mobile (compact fallback)', () => {
    it('renders every line at full opacity, with no pinning, under reduced motion', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      expect(section.style.height).toBe('')
      expect(container.querySelectorAll('p')).toHaveLength(6)
    })

    it('renders the compact fallback on mobile widths', () => {
      window.innerWidth = 600
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      expect(section.style.height).toBe('')
      expect(container.querySelectorAll('p')).toHaveLength(6)
    })

    // The grid's gap-y and the thread connector's calc(100% + gap) height used to be
    // two hand-matched literals ('3rem' vs gap-y-12) that could silently drift apart.
    // Both now read from the same --pos-gap CSS variable — this locks that coupling
    // so a future edit can't reintroduce a hardcoded, independently-drifting value.
    it('drives the grid gap and the thread connector from one shared variable', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<Position />)
      expect(container.querySelector('[class*="gap-y-[var(--pos-gap)]"]')).toBeInTheDocument()
      const strand = container.querySelector('span[style*="calc(100%"]')
      expect(strand).not.toBeNull()
      expect((strand as HTMLElement).style.height).toContain('var(--pos-gap)')
    })
  })
})
