import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * A2. `src/data/specs.ts` tells the maintainer, in its own words: "If a figure stays
 * unknown at launch, DELETE that row and drop the matching clip so the film runs three
 * cuts." Nothing enforced the second half of that sentence. `cardIndexAt` clamps to
 * `CLIP_STARTS.length - 1`, so with four clips and three cards it happily returned 3 —
 * and `FILM_CARDS[3]` was `undefined`, dereferenced unguarded.
 *
 * Film is a client component with no error boundary above it, so this took the whole
 * client tree down, not just the section. Doing exactly what the file instructs is not
 * an exotic input; it is the documented migration.
 *
 * This lives in its own file because `vi.mock` is hoisted per module, and the rest of
 * the Film suite needs the real four-card data.
 */
vi.mock('@/data/specs', async () => {
  const actual = await vi.importActual<typeof import('@/data/specs')>('@/data/specs')
  return { ...actual, FILM_CARDS: actual.FILM_CARDS.slice(0, 3) }
})

describe('Film with a card row dropped but the clip left in place', () => {
  it('survives a timeupdate past the last remaining card', async () => {
    const { Film } = await import('./Film')
    const { CLIP_STARTS, FILM_CARDS } = await import('@/data/specs')
    // Guards the guard: if the fixture ever stopped being lopsided this test would pass
    // for the wrong reason.
    expect(CLIP_STARTS.length).toBeGreaterThan(FILM_CARDS.length)

    render(<Film />)
    const video = document.querySelector('video')!
    Object.defineProperty(video, 'currentTime', {
      value: CLIP_STARTS[CLIP_STARTS.length - 1] + 1,
      configurable: true,
    })

    expect(() => fireEvent.timeUpdate(video)).not.toThrow()
    // Still showing a card rather than a blank overlay: the last one that exists.
    expect(screen.getByText(FILM_CARDS[FILM_CARDS.length - 1].counter)).toBeInTheDocument()
  })
})
