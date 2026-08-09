import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Hero } from './Hero'

function heroImage(): HTMLImageElement {
  return screen.getByRole('img', { name: /wardrobes and upholstered seating/i })
}

describe('Hero', () => {
  // The master image is the LCP element. Left to the default `loading="lazy"` it is
  // discovered late and the largest paint slips, which is invisible in every test and
  // in local development on a fast connection — exactly the kind of regression that
  // only shows up in field data months later.
  it('asks the browser to load the master image eagerly and at high priority', () => {
    const { container } = render(<Hero />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
  })

  it('carries id="top"', () => {
    render(<Hero />)
    expect(document.getElementById('top')).not.toBeNull()
  })

  // The single most important string on the site, in the task right after two
  // consecutive copy-drift incidents. Exact match, not a regex.
  it('carries the approved headline verbatim', () => {
    render(<Hero />)
    expect(screen.getByText('We measure your wall, then build to it.')).toBeInTheDocument()
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region, even when it contains a heading — the section itself needs
  // aria-labelledby pointing at that heading (brief §5).
  it('gives the section its accessible name from the h1', () => {
    render(<Hero />)
    expect(
      screen.getByRole('region', { name: 'We measure your wall, then build to it.' }),
    ).toBeInTheDocument()
  })

  it('carries the approved sub-line verbatim', () => {
    render(<Hero />)
    expect(
      screen.getByText(
        'Built-in wardrobes, pantry cupboards and upholstered seating, cut to the room you actually have.',
      ),
    ).toBeInTheDocument()
  })

  it('carries the primary CTA linking to #enquiry', () => {
    render(<Hero />)
    const cta = screen.getByRole('link', { name: 'Request a quotation' })
    expect(cta).toHaveAttribute('href', '#enquiry')
  })

  it('carries the secondary CTA linking to #work', () => {
    render(<Hero />)
    const cta = screen.getByRole('link', { name: 'See our work' })
    expect(cta).toHaveAttribute('href', '#work')
  })

  // D1: /media/hero-master.jpg does not exist. The probe confirmed next/image renders
  // a broken <img> and never throws, so without this the LCP element — the first
  // thing any visitor sees — would be blank. Reuses Film.tsx's onError stand-in
  // pattern: a solid navy block naming the exact slot.
  it('shows the master image before any error', () => {
    render(<Hero />)
    expect(heroImage()).toBeInTheDocument()
    expect(screen.queryByTestId('hero-fallback')).not.toBeInTheDocument()
  })

  it('falls back to a named navy stand-in when the master image is missing', () => {
    render(<Hero />)
    fireEvent.error(heroImage())
    expect(screen.queryByRole('img', { name: /wardrobes and upholstered seating/i })).not.toBeInTheDocument()
    const fallback = screen.getByTestId('hero-fallback')
    expect(fallback).toHaveTextContent('Image slot: /media/hero-master.jpg')
  })

  // The cutout sofa is aria-hidden decoration, not the LCP element and not named —
  // its stand-in is simply rendering nothing.
  it('renders the decorative cutout image before any error', () => {
    const { container } = render(<Hero />)
    expect(container.querySelector('[data-testid="hero-cutout"]')).not.toBeNull()
  })

  it('renders nothing in place of the decorative cutout once it fails to load', () => {
    const { container } = render(<Hero />)
    const cutout = container.querySelector('[data-testid="hero-cutout"]') as HTMLImageElement
    fireEvent.error(cutout)
    expect(container.querySelector('[data-testid="hero-cutout"]')).toBeNull()
    expect(container.querySelector('[data-testid="hero-cutout-fallback"]')).toBeNull()
  })

  // D2: pure white is not in the brand palette — text-paper carries display type on
  // navy, text-sky carries body copy.
  it('never uses text-white', () => {
    const { container } = render(<Hero />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  /**
   * A5. These two are contrast fixes, not styling preferences, so they are pinned.
   *
   * Measured in a real browser against the delivered hero-master.jpg — sampling the
   * actual photo pixels beneath each element and compositing bg-navy/72 over them,
   * plus the WeaveTexture's teal at 0.14 as the worst case:
   *
   *   sub-line as text-sky   4.20:1  (3.68 worst case) — AA normal text needs 4.5
   *   sub-line as text-paper 5.94:1                    — passes with margin
   *   border-teal            2.28:1  (2.03 worst case) — 1.4.11 non-text needs 3.0
   *   border-sky             3.45:1                    — passes
   *
   * Teal cannot be rescued by darkening the overlay: swept across 0.72/0.76/0.80/
   * 0.84/0.88 it reaches only 2.03/2.21/2.42/2.64/2.88 and never touches 3:1. That is
   * why the border colour changes rather than the overlay. The sub-line is the one
   * deliberate exception to D2's "text-sky carries body copy" — chosen over darkening
   * the overlay so the hero photograph stays visible.
   */
  it('keeps the hero sub-line and secondary CTA at their measured contrast colours', () => {
    render(<Hero />)
    const sub = screen.getByText(/Built-in wardrobes/)
    expect(sub.className).toMatch(/text-paper/)
    expect(sub.className).not.toMatch(/text-sky/)

    const secondary = screen.getByRole('link', { name: 'See our work' })
    expect(secondary.className).toMatch(/border-sky/)
    expect(secondary.className).not.toMatch(/border-teal/)
  })
})
