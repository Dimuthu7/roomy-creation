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
})
