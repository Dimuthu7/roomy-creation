import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WORKS } from '@/data/works'
import { rowSpan } from '@/lib/galleryLayout'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { GalleryGrid, GUTTER_ROWS } from './GalleryGrid'

function items(): HTMLElement[] {
  return Array.from(
    screen.getByTestId('gallery-grid').querySelectorAll<HTMLElement>('[data-work-id]'),
  )
}

describe('GalleryGrid', () => {
  it('renders all 24 works by default', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    expect(screen.getAllByRole('img')).toHaveLength(24)
  })

  it('gives every image real alt text with no placeholder', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    for (const img of screen.getAllByRole('img')) {
      expect(img).toHaveAccessibleName()
      expect(img.getAttribute('alt')).not.toContain('[TBC]')
    }
  })

  it('lazy-loads everything past the first eight', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const imgs = screen.getAllByRole('img')
    expect(imgs[0]).toHaveAttribute('loading', 'eager')
    expect(imgs[7]).toHaveAttribute('loading', 'eager')
    expect(imgs[8]).toHaveAttribute('loading', 'lazy')
  })

  it('filters to a single category when a chip is chosen', async () => {
    const user = userEvent.setup()
    render(<GalleryGrid onOpen={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Wardrobes' }))
    // AnimatePresence keeps the departing cards mounted until their exit animation
    // finishes. Measured: all 24 are still in the DOM immediately after the click, so
    // asserting a count here without waiting reads a mid-transition state.
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(5))
  })

  it('keeps the first visible cards eager after filtering', async () => {
    const user = userEvent.setup()
    render(<GalleryGrid onOpen={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Wardrobes' }))
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(5))
    // All five fit inside the eager window. Keying eagerness off the WORKS index
    // instead would leave three of them lazy, which is what this pins against.
    for (const img of screen.getAllByRole('img')) {
      expect(img).toHaveAttribute('loading', 'eager')
    }
  })

  it('marks the active filter chip for assistive tech', async () => {
    const user = userEvent.setup()
    render(<GalleryGrid onOpen={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Wardrobes' }))
    expect(screen.getByRole('button', { name: 'Wardrobes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('opens the lightbox at the clicked index', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<GalleryGrid onOpen={onOpen} />)
    await user.click(screen.getAllByRole('button', { name: /Built-in wardrobe/ })[0])
    expect(onOpen).toHaveBeenCalledWith(0)
  })

  it('exposes each card as a keyboard-reachable button', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const grid = screen.getByTestId('gallery-grid')
    expect(within(grid).getAllByRole('button')).toHaveLength(24)
  })

  // The two below are the point of Task 5. Without them the whole maths module could be
  // unwired — or wired to a recomputed guess — and every other test here still passes.
  it('sizes every card from the shared row-span maths', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const rendered = items()
    expect(rendered).toHaveLength(24)
    // Pinned concretely as well as derived: 3:2 over a 60-unit column is 40 rows, plus
    // the 2-row gutter. A silent change to either the maths or the gutter fails here.
    expect(rendered[0].style.gridRowEnd).toBe('span 42')
    rendered.forEach((el, i) => {
      expect(el.style.gridRowEnd).toBe(`span ${rowSpan(WORKS[i].ratio) + GUTTER_ROWS}`)
    })
  })

  it('applies the interlock offset from offsetFor', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const rendered = items()
    expect(rendered[0].className).not.toMatch(/translate-x/)
    expect(rendered[1].className).toContain('lg:-translate-x-6')
    expect(rendered[2].className).not.toMatch(/translate-x/)
    expect(rendered[3].className).toContain('lg:translate-x-6')
  })

  // jsdom has no CSS engine, so it cannot evaluate `@media (prefers-reduced-motion)` or the
  // `motion-safe:` variant's effect. The honest assertion available here is on the class
  // list itself: pin that the hover-transform utilities are wrapped in `motion-safe:`, which
  // Tailwind only applies under `(prefers-reduced-motion: no-preference)`. That is what makes
  // the image scale and the caption slide absent (not merely instant) for a user with the OS
  // reduced-motion preference set.
  it('gates the card hover transforms behind motion-safe', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const grid = screen.getByTestId('gallery-grid')
    const img = within(grid).getAllByRole('img')[0]
    expect(img.className).toContain('motion-safe:group-hover:scale-105')

    const caption = img.closest('button')?.querySelector('span')
    expect(caption).not.toBeNull()
    expect(caption!.className).toContain('motion-safe:translate-y-full')
    expect(caption!.className).toContain('motion-safe:group-hover:translate-y-0')
  })

  // A3: the grid renders a FILTERED list but the lightbox indexes the FULL WORKS array,
  // so the card has to hand back its position in WORKS, not its position on screen. The
  // only test that touched this clicked the first card of an unfiltered grid, where the
  // two numbers are both 0 — so `index={i}` passed all 339 tests while opening a sofa
  // for a visitor who filtered to wardrobes and clicked the third one.
  it('opens the work that was clicked, not the one at that position on screen', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<GalleryGrid onOpen={onOpen} />)

    await user.click(screen.getByRole('button', { name: 'Wardrobes' }))
    await waitFor(() => expect(items().length).toBeLessThan(WORKS.length))

    // The third wardrobe: on screen it is index 2, in WORKS it is something else entirely.
    const third = items()[2]
    const workId = third.getAttribute('data-work-id')
    const expected = WORKS.findIndex((w) => w.id === workId)
    expect(expected).toBeGreaterThan(2) // the test is worthless if the two indices agree

    await user.click(within(third).getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith(expected)
  })

  // The x offset was already gated on motion level; the opacity was not, so every card
  // rendered at opacity 0 on the server and stayed invisible until framer-motion
  // hydrated. Confirmed against the real production HTML: 24 `opacity:0` in the
  // document, exactly the card count. getServerSnapshot() returns 'reduced' precisely so
  // that a visitor with no JS keeps visible content — this is that contract.
  it('renders cards visible, not faded out, when motion is reduced', () => {
    setPrefersReducedMotion(true)
    render(<GalleryGrid onOpen={vi.fn()} />)
    for (const item of items()) {
      expect(item.style.opacity).not.toBe('0')
    }
  })
})
