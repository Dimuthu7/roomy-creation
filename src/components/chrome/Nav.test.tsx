import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setPrefersReducedMotion, getScrollIntoViewCalls } from '@/test/browserStubs'
import { Nav } from './Nav'

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

describe('Nav', () => {
  // Without this, every keyboard visitor tabs the whole nav before reaching content.
  it('is the first focusable thing on the page, and skips to #main', async () => {
    const user = userEvent.setup()
    render(<Nav />)
    await user.tab()
    const link = screen.getByRole('link', { name: 'Skip to content' })
    expect(document.activeElement).toBe(link)
    expect(link).toHaveAttribute('href', '#main')
  })

  it('is visually hidden until it receives focus', () => {
    render(<Nav />)
    const link = screen.getByRole('link', { name: 'Skip to content' })
    expect(link.className.split(/\s+/)).toContain('sr-only')
    expect(link.className).toMatch(/focus-visible:not-sr-only/)
  })

  it('renders a header wrapping a nav landmark named "Primary"', () => {
    const { container } = render(<Nav />)
    const header = container.querySelector('header')
    expect(header).not.toBeNull()
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(header?.contains(nav)).toBe(true)
  })

  it('the logo links to #top', () => {
    render(<Nav />)
    const logoLink = screen.getByRole('link', { name: 'Roomy Creations' })
    expect(logoLink).toHaveAttribute('href', '#top')
  })

  // Nav sits on a navy bar, so it needs the yellow wordmark specifically — the navy
  // variant would be invisible against it, the same defect the brief flags for
  // Footer (§4).
  it('renders the yellow logo variant, not the navy one that would vanish on the bar', () => {
    render(<Nav />)
    expect(screen.getByText('Roomy Creations')).toHaveClass('text-yellow')
  })

  // Nav labels are not client-approved yet — flagged for sign-off, brief §8.
  it('links Work, Process and Materials to their exact section ids', () => {
    render(<Nav />)
    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '#work')
    expect(screen.getByRole('link', { name: 'Process' })).toHaveAttribute('href', '#how')
    expect(screen.getByRole('link', { name: 'Materials' })).toHaveAttribute('href', '#materials')
  })

  it('the CTA links to #enquiry and reads "Request a quotation"', () => {
    render(<Nav />)
    const cta = screen.getByRole('link', { name: 'Request a quotation' })
    expect(cta).toHaveAttribute('href', '#enquiry')
  })

  // The client's rule is absolute: teal is a line/edge colour only, never text or a
  // control on navy (2.7:1). The CTA is styled as the yellow button; every other link
  // is text-sky.
  it('styles the CTA as the yellow button and every other link as text-sky, never teal text', () => {
    render(<Nav />)
    const cta = screen.getByRole('link', { name: 'Request a quotation' })
    expect(cta.className).toMatch(/bg-yellow/)
    expect(cta.className).toMatch(/text-navy/)
    for (const name of ['Work', 'Process', 'Materials']) {
      const link = screen.getByRole('link', { name })
      expect(link.className).toMatch(/text-sky/)
      expect(link.className).not.toMatch(/text-teal/)
    }
  })

  it('is fixed to the top, above the page, with a hairline so it is visible over a navy hero', () => {
    const { container } = render(<Nav />)
    const header = container.querySelector('header') as HTMLElement
    expect(header.className).toMatch(/fixed/)
    expect(header.className).toMatch(/top-0/)
    expect(header.className).toMatch(/z-50/)
    expect(header.className).toMatch(/bg-navy/)
    expect(header.className).toMatch(/border-b/)
    expect(header.className).toMatch(/border-teal\/30/)
  })

  // No hamburger drawer: four anchors fit in a horizontally scrollable row, and a
  // drawer is a focus-trap that would have to be written, tested and maintained for
  // four links.
  it('builds no hamburger menu button — the link row itself collapses on mobile', () => {
    render(<Nav />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('never uses text-white', () => {
    const { container } = render(<Nav />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  // Plain anchors jump instantly with no easing. Every link — section links and the
  // CTA alike — should animate to its target instead, the same way Hero's own scroll
  // cue and the enquiry prefill already do.
  describe('smooth scroll on click', () => {
    it('smooth-scrolls to the target section when a link is clicked, instead of jumping natively', async () => {
      const user = userEvent.setup()
      render(
        <>
          <Nav />
          <div id="work" />
        </>,
      )
      await user.click(screen.getByRole('link', { name: 'Work' }))
      const calls = getScrollIntoViewCalls()
      expect(calls[calls.length - 1].arg).toEqual({ behavior: 'smooth' })
    })

    it('smooth-scrolls when the CTA is clicked too', async () => {
      const user = userEvent.setup()
      render(
        <>
          <Nav />
          <div id="enquiry" />
        </>,
      )
      await user.click(screen.getByRole('link', { name: 'Request a quotation' }))
      const calls = getScrollIntoViewCalls()
      expect(calls[calls.length - 1].arg).toEqual({ behavior: 'smooth' })
    })

    it('dims the section links on tap and compresses the CTA pill, since :hover alone does not fire on touch', () => {
      render(<Nav />)
      for (const name of ['Work', 'Process', 'Materials']) {
        expect(screen.getByRole('link', { name }).className).toMatch(/active:opacity-60/)
      }
      expect(screen.getByRole('link', { name: 'Request a quotation' }).className).toMatch(
        /active:scale-95/,
      )
    })

    it('scrolls instantly under reduced motion', async () => {
      setPrefersReducedMotion(true)
      const user = userEvent.setup()
      render(
        <>
          <Nav />
          <div id="work" />
        </>,
      )
      await user.click(screen.getByRole('link', { name: 'Work' }))
      const calls = getScrollIntoViewCalls()
      expect(calls[calls.length - 1].arg).toEqual({ behavior: 'auto' })
    })
  })

  describe('scroll shrink', () => {
    it('renders at resting size before any scroll', () => {
      render(<Nav />)
      const nav = screen.getByRole('navigation', { name: 'Primary' })
      const logoLink = screen.getByRole('link', { name: 'Roomy Creations' })
      expect(nav.className).toMatch(/py-4/)
      expect(logoLink.className).toMatch(/scale-100/)
    })

    it('shrinks the main row and logo once scrolled past the threshold', () => {
      render(<Nav />)
      const nav = screen.getByRole('navigation', { name: 'Primary' })
      const logoLink = screen.getByRole('link', { name: 'Roomy Creations' })
      scrollTo(200)
      expect(nav.className).toMatch(/py-2\.5/)
      expect(nav.className).not.toMatch(/py-4/)
      expect(logoLink.className).toMatch(/scale-90/)
    })

    it('grows back to resting size once scrolled back near the top', () => {
      render(<Nav />)
      const nav = screen.getByRole('navigation', { name: 'Primary' })
      scrollTo(200)
      scrollTo(0)
      expect(nav.className).toMatch(/py-4/)
    })

    it('lifts the header with a translucent, blurred background once scrolled', () => {
      const { container } = render(<Nav />)
      const header = container.querySelector('header') as HTMLElement
      scrollTo(200)
      expect(header.className).toMatch(/bg-navy\/95/)
      expect(header.className).toMatch(/backdrop-blur-sm/)
    })

    it('never shrinks when the user prefers reduced motion', () => {
      setPrefersReducedMotion(true)
      render(<Nav />)
      const nav = screen.getByRole('navigation', { name: 'Primary' })
      scrollTo(200)
      expect(nav.className).toMatch(/py-4/)
      expect(nav.className).not.toMatch(/py-2\.5/)
    })
  })
})
