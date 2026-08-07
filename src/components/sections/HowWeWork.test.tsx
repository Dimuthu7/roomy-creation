import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { HowWeWork } from './HowWeWork'

const STEPS = [
  'Enquiry',
  'Site measurement',
  'Drawings, materials and quotation',
  'Manufacture',
  'Installation and handover',
]

describe('HowWeWork', () => {
  // Measured with the project's own contrastRatio helper: navy at 60% opacity resolves
  // to 3.48:1 over the yellow block and 3.87:1 over paper. `.u-mono` is 12px, so the AA
  // floor is 4.5:1 — every step number and lead time in this section failed it. Full
  // navy is 8.84:1 on yellow and 12.61:1 on paper. jsdom has no CSS engine, so the
  // class list is the only thing assertable here.
  it('never fades the small mono text to an opacity that fails AA', () => {
    const { container } = render(<HowWeWork />)
    expect(container.querySelectorAll('[class*="text-navy/"]')).toHaveLength(0)
  })

  // WeaveReveal renders a motion.div. Wrapping each <li> in one puts a <div> between
  // the <ol> and its items, which is invalid and costs the list its semantics — a
  // screen reader stops announcing "list, 5 items". The reveal belongs inside the <li>.
  it('keeps the five steps as direct children of the list', () => {
    render(<HowWeWork />)
    const list = screen.getByRole('list')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect([...list.children].every((child) => child.tagName === 'LI')).toBe(true)
  })

  it('carries id="how"', () => {
    render(<HowWeWork />)
    expect(document.getElementById('how')).not.toBeNull()
  })

  // F2: the probe found four headings for nine sections, and this section — where
  // the "we measure your apartment correctly" argument lives — had none, so it was
  // unreachable by heading navigation. "How we work" is a structural label, not a
  // marketing claim, and is flagged for sign-off (brief §8).
  it('carries a heading naming the section, above the step list', () => {
    render(<HowWeWork />)
    const heading = screen.getByRole('heading', { name: 'How we work' })
    const list = screen.getByRole('list')
    expect(heading.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('gives the section its accessible name from that heading', () => {
    render(<HowWeWork />)
    expect(screen.getByRole('region', { name: 'How we work' })).toBeInTheDocument()
  })

  // M8: the five steps have to render in this exact order.
  it('renders the five steps in the approved order', () => {
    const { container } = render(<HowWeWork />)
    const text = container.textContent ?? ''
    const positions = STEPS.map((step) => {
      expect(screen.getByText(step)).toBeInTheDocument()
      return text.indexOf(step)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('gives Site measurement, step two, the heaviest visual treatment', () => {
    const { container } = render(<HowWeWork />)
    const step2 = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
    expect(step2).toHaveTextContent('Site measurement')
    expect(step2.className).toMatch(/bg-yellow/)
    const step1 = container.querySelector('[data-testid="how-step-0"]') as HTMLElement
    expect(step1.className).not.toMatch(/bg-yellow/)
  })

  it('shows an em dash for lead time, never the [TBC] sentinel', () => {
    const { container } = render(<HowWeWork />)
    expect(container.textContent).not.toContain('[TBC]')
    expect(screen.getAllByText('—')).toHaveLength(5)
  })

  it('never uses text-white', () => {
    const { container } = render(<HowWeWork />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  // The client's rule is absolute: prefers-reduced-motion disables all transforms and
  // autoplay. The drifting module must carry none at all under reduced motion.
  it('applies no transform to the drifting module under reduced motion, even on scroll', () => {
    setPrefersReducedMotion(true)
    const { container } = render(<HowWeWork />)
    const driftEl = container.querySelector('[data-testid="how-cutout-inner"]') as HTMLElement
    expect(driftEl.style.transform).toBe('')
    fireEvent.scroll(window, { target: { scrollY: 400 } })
    expect(driftEl.style.transform).toBe('')
  })

  it('drifts the module on scroll at full motion', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<HowWeWork />)
    const driftEl = container.querySelector('[data-testid="how-cutout-inner"]') as HTMLElement
    const before = driftEl.style.transform
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })
    fireEvent.scroll(window)
    await waitFor(() => expect(driftEl.style.transform).not.toBe(before))
  })
})
