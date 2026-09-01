import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import { setPrefersReducedMotion, getScrollIntoViewCalls } from '@/test/browserStubs'
import { Nav } from './Nav'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))
vi.mock('@/app/admin/actions', () => ({ logout: vi.fn() }))

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue('/')
})

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
  it('links Work, Process, Materials and Testimonials to their exact section ids', () => {
    render(<Nav />)
    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '#work')
    expect(screen.getByRole('link', { name: 'Process' })).toHaveAttribute('href', '#how')
    expect(screen.getByRole('link', { name: 'Materials' })).toHaveAttribute('href', '#materials')
    expect(screen.getByRole('link', { name: 'Testimonials' })).toHaveAttribute('href', '#testimonials')
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
    for (const name of ['Work', 'Process', 'Materials', 'Testimonials']) {
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
      for (const name of ['Work', 'Process', 'Materials', 'Testimonials']) {
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

  // Below `sm:` the link row collapses behind a hamburger so it no longer needs to
  // horizontally scroll; at `sm:` and up it reverts to the plain inline row.
  describe('mobile menu', () => {
    it('shows exactly one hamburger toggle, closed by default, hidden from `sm:` up', () => {
      render(<Nav />)
      const toggle = screen.getByRole('button', { name: 'Open menu' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(toggle.className).toMatch(/sm:hidden/)
    })

    it('opens the link panel and relabels the toggle when clicked, and closes again on a second click', async () => {
      const user = userEvent.setup()
      render(<Nav />)
      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      await user.click(screen.getByRole('button', { name: 'Close menu' }))
      expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })

    it('associates the toggle with the panel it controls', () => {
      render(<Nav />)
      const toggle = screen.getByRole('button', { name: 'Open menu' })
      const panelId = toggle.getAttribute('aria-controls')
      expect(panelId).toBeTruthy()
      expect(document.getElementById(panelId as string)).not.toBeNull()
    })

    it('closes the panel once a link inside it is clicked, after smooth-scrolling to that section', async () => {
      const user = userEvent.setup()
      render(
        <>
          <Nav />
          <div id="work" />
        </>,
      )
      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      await user.click(screen.getByRole('link', { name: 'Work' }))
      const calls = getScrollIntoViewCalls()
      expect(calls[calls.length - 1].arg).toEqual({ behavior: 'smooth' })
      expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
    })

    it('puts the CTA inside the collapsible panel, alongside the links, so it opens and closes with the menu', () => {
      render(<Nav />)
      const cta = screen.getByRole('link', { name: 'Request a quotation' })
      const panel = document.getElementById('mobile-nav-panel')
      expect(panel?.contains(cta)).toBe(true)
    })

    it('collapses the panel to zero height and opacity when closed, and expands it when opened', async () => {
      const user = userEvent.setup()
      render(<Nav />)
      const panel = document.getElementById('mobile-nav-panel') as HTMLElement
      expect(panel.className).toMatch(/max-h-0/)
      expect(panel.className).toMatch(/opacity-0/)
      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(panel.className).toMatch(/max-h-96/)
      expect(panel.className).toMatch(/opacity-100/)
    })

    it('animates the panel open under normal motion, but snaps instantly under reduced motion', () => {
      const panel = () => document.getElementById('mobile-nav-panel') as HTMLElement
      const { unmount } = render(<Nav />)
      expect(panel().className).toMatch(/transition-\[max-height,opacity\]/)
      unmount()

      setPrefersReducedMotion(true)
      render(<Nav />)
      expect(panel().className).not.toMatch(/transition-\[max-height,opacity\]/)
    })
  })

  // Under /admin, the bar keeps its shape but swaps marketing links for admin
  // controls — verified against a nested protected route, not just "/admin" itself.
  describe('admin variant', () => {
    beforeEach(() => {
      vi.mocked(usePathname).mockReturnValue('/admin/site-details')
    })

    it('shows Home, View site and Sign out instead of the marketing links and CTA', () => {
      render(<Nav />)
      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/admin')
      expect(screen.getByRole('link', { name: 'View site' })).toHaveAttribute('href', '/')
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
      for (const name of ['Work', 'Process', 'Materials', 'Testimonials', 'Request a quotation']) {
        expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
      }
    })

    it('opens "View site" in a new tab safely', () => {
      render(<Nav />)
      const link = screen.getByRole('link', { name: 'View site' })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('submits Sign out as a form targeting the logout action, not a plain link', () => {
      render(<Nav />)
      const button = screen.getByRole('button', { name: 'Sign out' })
      expect(button).toHaveAttribute('type', 'submit')
      expect(button.closest('form')).not.toBeNull()
    })

    it('links the logo to /admin instead of #top', () => {
      render(<Nav />)
      const logoLink = screen.getByRole('link', { name: 'Roomy Creations' })
      expect(logoLink).toHaveAttribute('href', '/admin')
    })

    // Stands in for the page-level "Roomy Creations — Admin" header that used to be
    // the only thing telling an admin which mode they were in.
    it('shows an "Admin" indicator next to the logo', () => {
      render(<Nav />)
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })
  })

  it('shows no "Admin" indicator on marketing routes', () => {
    render(<Nav />)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })
})
