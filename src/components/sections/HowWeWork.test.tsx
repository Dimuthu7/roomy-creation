import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { HowWeWork } from './HowWeWork'

const TITLES = [
  'Enquiry',
  'Site measurement',
  'Drawings, materials and quotation',
  'Manufacture',
  'Installation and handover',
]

const DESCRIPTIONS = [
  'Tell us what you need and we start the conversation.',
  'We visit your site and take precise measurements before anything is drawn.',
  'Measurements become drawings, material choices and a firm quote.',
  'Your piece is built to spec in our workshop.',
  'We fit it on site and hand it over, ready to use.',
]

describe('HowWeWork', () => {
  it('never fades the small mono text to an opacity that fails AA', () => {
    const { container } = render(<HowWeWork />)
    expect(container.querySelectorAll('[class*="text-navy/"]')).toHaveLength(0)
  })

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

  it('renders the five step titles in the approved order', () => {
    const { container } = render(<HowWeWork />)
    const text = container.textContent ?? ''
    const positions = TITLES.map((title) => {
      expect(screen.getByText(title)).toBeInTheDocument()
      return text.indexOf(title)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('gives each step a short description, in the approved order', () => {
    const { container } = render(<HowWeWork />)
    const text = container.textContent ?? ''
    const positions = DESCRIPTIONS.map((line) => {
      expect(screen.getByText(line)).toBeInTheDocument()
      return text.indexOf(line)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('never shows the [TBC] sentinel or a lead-time dash', () => {
    const { container } = render(<HowWeWork />)
    expect(container.textContent).not.toContain('[TBC]')
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('gives each step card a decorative icon', () => {
    const { container } = render(<HowWeWork />)
    for (let i = 0; i < 5; i++) {
      const card = container.querySelector(`[data-testid="how-step-${i}"]`) as HTMLElement
      expect(card.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it('never uses text-white', () => {
    const { container } = render(<HowWeWork />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  describe('at full motion (pinned horizontal journey)', () => {
    it('pins the track for a scroll distance proportional to the step count', () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      // STEP_VH (45) * 5 steps
      expect(track.style.height).toBe('225vh')
      expect(track.querySelector('.sticky')).not.toBeNull()
    })

    it('marks only the first step active on initial render', () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      expect(track.dataset.activeIndex).toBe('0')
    })

    it('advances which step is active as the section scrolls past', async () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      track.getBoundingClientRect = () =>
        ({
          top: -300,
          height: 2000,
          bottom: 1700,
          left: 0,
          right: 0,
          x: 0,
          y: -300,
          width: 0,
          toJSON() {},
        }) as DOMRect
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      fireEvent.scroll(window)
      await waitFor(() => expect(track.dataset.activeIndex).toBe('1'))
    })

    it('gives Site measurement the heavy yellow treatment once it becomes the active step, not before', async () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      const step1 = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
      expect(step1.className).not.toMatch(/bg-yellow/)
      track.getBoundingClientRect = () =>
        ({
          top: -300,
          height: 2000,
          bottom: 1700,
          left: 0,
          right: 0,
          x: 0,
          y: -300,
          width: 0,
          toJSON() {},
        }) as DOMRect
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      fireEvent.scroll(window)
      await waitFor(() => expect(track.dataset.activeIndex).toBe('1'))
      expect(step1.className).toMatch(/bg-yellow/)
    })

    it('centers the row so the active card sits in the middle on initial render', async () => {
      const { container } = render(<HowWeWork />)
      const list = container.querySelector('[data-testid="how-track-list"]') as HTMLElement
      // CARD_SPACING (344) * ((5 - 1) / 2 - active); active = 0 initially
      await waitFor(() => expect(list.style.transform).toBe('translateX(688px)'))
    })

    it('translates the row together with the active index as the section scrolls', async () => {
      const { container } = render(<HowWeWork />)
      const track = container.querySelector('[data-testid="how-track"]') as HTMLElement
      const list = container.querySelector('[data-testid="how-track-list"]') as HTMLElement
      track.getBoundingClientRect = () =>
        ({
          top: -300,
          height: 2000,
          bottom: 1700,
          left: 0,
          right: 0,
          x: 0,
          y: -300,
          width: 0,
          toJSON() {},
        }) as DOMRect
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      fireEvent.scroll(window)
      await waitFor(() => expect(track.dataset.activeIndex).toBe('1'))
      await waitFor(() => expect(list.style.transform).toBe('translateX(344px)'))
    })

    it('dims non-active cards to a contrast-safe opacity, not the fully-visible one', async () => {
      const { container } = render(<HowWeWork />)
      const active = container.querySelector('[data-testid="how-step-0"]') as HTMLElement
      const inactive = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
      await waitFor(() => expect(active.style.opacity).toBe('1'))
      await waitFor(() => expect(inactive.style.opacity).toBe('0.7'))
    })

    it('renders a progress dot per step, marking only the active one', () => {
      const { container } = render(<HowWeWork />)
      for (let i = 0; i < 5; i++) {
        const dot = container.querySelector(`[data-testid="how-dot-${i}"]`) as HTMLElement
        expect(dot).not.toBeNull()
        expect(dot.className).toMatch(i === 0 ? /bg-yellow/ : /bg-navy\/20/)
      }
    })
  })

  describe('under reduced motion or on mobile (compact fallback)', () => {
    it('gives Site measurement, step two, the heaviest visual treatment permanently', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<HowWeWork />)
      const step2 = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
      expect(step2).toHaveTextContent('Site measurement')
      expect(step2.className).toMatch(/bg-yellow/)
      const step1 = container.querySelector('[data-testid="how-step-0"]') as HTMLElement
      expect(step1.className).not.toMatch(/bg-yellow/)
    })

    it('renders no pinned track under reduced motion', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<HowWeWork />)
      expect(container.querySelector('[data-testid="how-track"]')).toBeNull()
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })

    it('renders the compact fallback on mobile widths', () => {
      window.innerWidth = 600
      const { container } = render(<HowWeWork />)
      expect(container.querySelector('[data-testid="how-track"]')).toBeNull()
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })
  })

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
