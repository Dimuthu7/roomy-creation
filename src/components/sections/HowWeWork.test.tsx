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
  it('carries id="how"', () => {
    render(<HowWeWork />)
    expect(document.getElementById('how')).not.toBeNull()
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
