import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { WhatWeMake } from './WhatWeMake'

const LABELS = [
  'Sofas & seating',
  'Kitchens & pantry cupboards',
  'Wardrobes & storage',
  'TV & living units',
  'Office & commercial',
]

function stubRect(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 120, right: 200, bottom: 120, x: 0, y: 0, toJSON() {} }) as DOMRect
}

describe('WhatWeMake', () => {
  it('renders all five card labels, in the approved order', () => {
    const { container } = render(<WhatWeMake />)
    const text = container.textContent ?? ''
    const positions = LABELS.map((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
      return text.indexOf(label)
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  // M7 / the motion-level rule is absolute: reduced motion disables all transforms.
  it('applies no 3D transform to a card under reduced motion, even on pointer move', () => {
    setPrefersReducedMotion(true)
    const { container } = render(<WhatWeMake />)
    const card = container.querySelector('[data-testid="make-card-0"]') as HTMLElement
    expect(card.style.transform).toBe('')
    stubRect(card)
    fireEvent.pointerMove(card, { clientX: 180, clientY: 10 })
    expect(card.style.transform).toBe('')
  })

  it('tilts a card in 3D on pointer move at full motion', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<WhatWeMake />)
    const card = container.querySelector('[data-testid="make-card-0"]') as HTMLElement
    stubRect(card)
    const before = card.style.transform
    fireEvent.pointerMove(card, { clientX: 180, clientY: 10 })
    // framer-motion applies a motion value's `.set()` through its own frame-loop
    // scheduler rather than synchronously, unlike the `initial` prop written at mount
    // — so this has to wait a tick rather than read the style immediately.
    await waitFor(() => expect(card.style.transform).not.toBe(before))
  })

  it('never uses text-white', () => {
    const { container } = render(<WhatWeMake />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  // F2: this section had no heading at all, so it was unreachable by heading
  // navigation and, as a bare <section>, was not exposed as a landmark region
  // either. "What we make" is a structural label, not a marketing claim — flagged
  // for sign-off (brief §8).
  it('carries a heading naming the section, above the card grid', () => {
    render(<WhatWeMake />)
    const heading = screen.getByRole('heading', { name: 'What we make' })
    const firstCard = screen.getByText('Sofas & seating')
    expect(
      heading.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('gives the section its accessible name from that heading', () => {
    render(<WhatWeMake />)
    expect(screen.getByRole('region', { name: 'What we make' })).toBeInTheDocument()
  })

  it('gives each card its own icon, above the label', () => {
    const { container } = render(<WhatWeMake />)
    LABELS.forEach((_, i) => {
      const card = container.querySelector(`[data-testid="make-card-${i}"]`) as HTMLElement
      expect(card.querySelector('svg')).not.toBeNull()
    })
  })

  // Not styled via `:hover` alone — a bordered box with a flat navy fill read as an
  // empty outline rather than something a visitor could touch, on the mobile view
  // this section actually ships on.
  it('brightens a card’s border and background on press, a colour change so it still plays under reduced motion', () => {
    const { container } = render(<WhatWeMake />)
    const card = container.querySelector('[data-testid="make-card-0"]') as HTMLElement
    expect(card.className).toMatch(/active:border-teal\/60/)
    expect(card.className).toMatch(/active:bg-teal\/15/)

    setPrefersReducedMotion(true)
    const { container: reducedContainer } = render(<WhatWeMake />)
    const reducedCard = reducedContainer.querySelector('[data-testid="make-card-0"]') as HTMLElement
    expect(reducedCard.className).toMatch(/active:border-teal\/60/)
    expect(reducedCard.className).toMatch(/active:bg-teal\/15/)
  })

  // `whileTap` makes framer-motion auto-inject tabIndex=0 on mount, turning a
  // presentational card into a dead keyboard stop — the explicit override has to hold.
  it('does not turn cards into keyboard tab stops', () => {
    const { container } = render(<WhatWeMake />)
    const card = container.querySelector('[data-testid="make-card-0"]') as HTMLElement
    expect(card.tabIndex).toBe(-1)
  })
})
