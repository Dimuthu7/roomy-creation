import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    const { container } = render(<HowWeWork />)
    const list = container.querySelector('ol') as HTMLElement
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(5)
    expect([...list.children].every((child) => child.tagName === 'LI')).toBe(true)
  })

  it('carries id="how"', () => {
    render(<HowWeWork />)
    expect(document.getElementById('how')).not.toBeNull()
  })

  it('carries a heading naming the section, above the step list', () => {
    const { container } = render(<HowWeWork />)
    const heading = screen.getByRole('heading', { name: 'How we work' })
    const list = container.querySelector('ol') as HTMLElement
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

  describe('at full motion (page-turning book)', () => {
    it('opens on the first step and hides the rest from assistive tech', () => {
      const { container } = render(<HowWeWork />)
      const book = container.querySelector('[data-testid="how-book"]') as HTMLElement
      expect(book.dataset.activeIndex).toBe('0')
      const step0 = container.querySelector('[data-testid="how-step-0"]') as HTMLElement
      expect(step0).not.toHaveAttribute('aria-hidden', 'true')
      for (let i = 1; i < 5; i++) {
        const step = container.querySelector(`[data-testid="how-step-${i}"]`) as HTMLElement
        expect(step).toHaveAttribute('aria-hidden', 'true')
      }
    })

    it('turns to the next page on click, exposing it and hiding the previous one', () => {
      const { container } = render(<HowWeWork />)
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
      const book = container.querySelector('[data-testid="how-book"]') as HTMLElement
      expect(book.dataset.activeIndex).toBe('1')
      expect(container.querySelector('[data-testid="how-step-1"]')).not.toHaveAttribute(
        'aria-hidden',
        'true',
      )
      expect(container.querySelector('[data-testid="how-step-0"]')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
    })

    it('disables the previous button on the first page and the next button on the last', () => {
      render(<HowWeWork />)
      expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled()
      for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
      expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled()
    })

    it('jumps straight to a page when its dot is clicked', () => {
      const { container } = render(<HowWeWork />)
      fireEvent.click(screen.getByRole('button', { name: /Go to step 4 of 5/ }))
      const book = container.querySelector('[data-testid="how-book"]') as HTMLElement
      expect(book.dataset.activeIndex).toBe('3')
    })

    it('turns pages with the left and right arrow keys', () => {
      const { container } = render(<HowWeWork />)
      const book = container.querySelector('[data-testid="how-book"]') as HTMLElement
      fireEvent.keyDown(book, { key: 'ArrowRight' })
      expect(book.dataset.activeIndex).toBe('1')
      fireEvent.keyDown(book, { key: 'ArrowLeft' })
      expect(book.dataset.activeIndex).toBe('0')
    })

    it('gives whichever page is open the heavy yellow treatment, not a fixed step', () => {
      const { container } = render(<HowWeWork />)
      const step0 = container.querySelector('[data-testid="how-step-0"]') as HTMLElement
      const step1 = container.querySelector('[data-testid="how-step-1"]') as HTMLElement
      expect(step0.className).toMatch(/bg-yellow/)
      expect(step1.className).not.toMatch(/bg-yellow/)

      fireEvent.click(screen.getByRole('button', { name: 'Next step' }))

      expect(step0.className).not.toMatch(/bg-yellow/)
      expect(step1.className).toMatch(/bg-yellow/)
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

    it('renders no book widget under reduced motion', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<HowWeWork />)
      expect(container.querySelector('[data-testid="how-book"]')).toBeNull()
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })

    it('renders the compact fallback on mobile widths', () => {
      window.innerWidth = 600
      const { container } = render(<HowWeWork />)
      expect(container.querySelector('[data-testid="how-book"]')).toBeNull()
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })
  })
})
