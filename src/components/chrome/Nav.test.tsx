import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from './Nav'

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
})
