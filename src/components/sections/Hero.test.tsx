import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Hero } from './Hero'

function heroImage(): HTMLImageElement {
  return screen.getByRole('img', { name: /wardrobes and upholstered seating/i })
}

describe('Hero', () => {
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
})
