import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WORKS } from '@/data/works'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { GalleryGrid } from './GalleryGrid'

// These tests exercise GalleryGrid's own behavior — eager/lazy cutoff, category
// filtering, the screen-position vs WORKS-index distinction — which holds at
// any catalog size. Point WORKS at the full 24-slot planned catalog rather than
// the real (delivered-only) export, which is too small right now to exercise
// the eager-past-8 or three-deep-filter cases below. Catalog-size-specific
// behavior (hiding empty categories, showing only delivered photos) is covered
// separately in GalleryGrid.deliveredCatalog.test.tsx against the real export.
vi.mock('@/data/works', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/works')>()
  return { ...actual, WORKS: actual.ALL_WORKS }
})

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

  // Every cell renders at the same fixed aspect ratio and the grid uses a plain
  // gap, rather than the previous per-work row-span plus sideways translate
  // "brick" interlock — the client saw that as messy (staggered column tops,
  // visibly different card sizes) and asked for a uniform, evenly aligned grid.
  it('sizes every card to the same fixed aspect ratio, with no sideways offset', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const rendered = items()
    expect(rendered).toHaveLength(24)
    for (const el of rendered) {
      expect(el.className).toContain('aspect-[4/3]')
      expect(el.className).not.toMatch(/translate-x/)
    }
  })

  it('spaces cards with a real grid gap, not a baked-in per-cell gutter', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const grid = screen.getByTestId('gallery-grid')
    expect(grid.className).toContain('gap-6')
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

  // The client wants the filter chips reachable while scrolling the grid, rather
  // than having to scroll back to the top to change category. `top-[65px]` is the
  // nav's own measured height, so the filter row sits flush under it with no gap
  // (rather than the 5rem anchor-scroll clearance globals.css uses elsewhere, which
  // would leave one). `bg-navy` is required — without an opaque background the
  // grid's own images would show through, and scroll underneath, the pinned bar.
  it('pins the filter row flush under the fixed nav while scrolling the grid', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const filterRow = screen.getByRole('group', { name: 'Filter work by category' })
    const stickyWrapper = filterRow.parentElement
    expect(stickyWrapper?.className).toContain('sticky')
    expect(stickyWrapper?.className).toContain('top-[65px]')
    expect(stickyWrapper?.className).toContain('bg-navy')
  })
})
