import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TBC } from '@/lib/tbc'
import { SITE_FIXTURE } from '@/test/fixtures'

async function renderFooter() {
  const { Footer } = await import('./Footer')
  return render(await Footer())
}

beforeEach(() => {
  vi.resetModules()
  vi.doUnmock('@/data/site')
  vi.doMock('@/data/site', () => ({ getSiteConfig: async () => SITE_FIXTURE }))
})

describe('Footer', () => {
  it('renders as the page footer landmark', async () => {
    const { container } = await renderFooter()
    expect(container.querySelector('footer')).not.toBeNull()
  })

  // brief §4: the navy variant on a navy footer would be invisible — the yellow mark
  // is the one that reads against it.
  it('renders the yellow logo variant, not the navy one that would vanish on navy', async () => {
    await renderFooter()
    expect(screen.getByText('Roomy Creations')).toHaveClass('text-yellow')
  })

  // Every block is [TBC]-gated exactly like Enquiry.tsx: a heading only renders once
  // it has content beneath it. Forced explicitly to [TBC] here rather than relying on
  // site.ts's ambient state, which stopped being all-TBC once real contact details
  // were entered — this test proves the gating logic, not today's data.
  it('renders no contact, visit, districts or follow block while site data is all [TBC]', async () => {
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({
        ...SITE_FIXTURE,
        phone: TBC,
        email: TBC,
        addressLines: TBC,
        city: TBC,
        openingHours: TBC,
        districts: TBC,
        social: { facebook: TBC, instagram: TBC, tiktok: TBC },
      }),
    }))
    const { container } = await renderFooter()
    expect(screen.queryByRole('heading', { name: 'Contact' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Visit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Districts we cover' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Follow' })).not.toBeInTheDocument()
    expect(container.textContent).not.toContain('[TBC]')
  })

  it('renders only the copyright line, no "all rights reserved" or tagline', async () => {
    const { container } = await renderFooter()
    const year = new Date().getFullYear()
    expect(screen.getByText(`© ${year} Roomy Creations`)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/all rights reserved/i)
  })

  it('shows the contact block, as tel: and mailto: links, once phone and email are known', async () => {
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({ ...SITE_FIXTURE, phone: '+94112345678', email: 'hello@example.lk' }),
    }))
    await renderFooter()
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+94112345678' })).toHaveAttribute(
      'href',
      'tel:+94112345678',
    )
    expect(screen.getByRole('link', { name: 'hello@example.lk' })).toHaveAttribute(
      'href',
      'mailto:hello@example.lk',
    )
  })

  it('dims contact links on tap, since :hover alone does not fire on touch', async () => {
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({ ...SITE_FIXTURE, phone: '+94112345678', email: 'hello@example.lk' }),
    }))
    await renderFooter()
    expect(screen.getByRole('link', { name: '+94112345678' }).className).toMatch(
      /active:opacity-60/,
    )
  })

  it('compresses the "Request a quotation" CTA on tap', async () => {
    await renderFooter()
    expect(screen.getByRole('link', { name: 'Request a quotation' }).className).toMatch(
      /active:scale-95/,
    )
  })

  it('shows the visit block once address, city or opening hours is known', async () => {
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({
        ...SITE_FIXTURE,
        addressLines: ['12 Galle Road'],
        city: 'Colombo',
        openingHours: ['Mo-Sa 09:00-18:00'],
      }),
    }))
    const { container } = await renderFooter()
    expect(screen.getByRole('heading', { name: 'Visit' })).toBeInTheDocument()
    expect(screen.getByText('12 Galle Road')).toBeInTheDocument()
    expect(screen.getByText('Colombo')).toBeInTheDocument()
    expect(screen.getByText('Mo-Sa 09:00-18:00')).toBeInTheDocument()
    expect(container.textContent).not.toContain('[TBC]')
  })

  it('shows the districts block once site.districts is known', async () => {
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({ ...SITE_FIXTURE, districts: ['Colombo', 'Gampaha'] }),
    }))
    await renderFooter()
    expect(screen.getByRole('heading', { name: 'Districts we cover' })).toBeInTheDocument()
    expect(screen.getByText('Colombo, Gampaha')).toBeInTheDocument()
  })

  it('shows the follow block with working links once a social handle is known', async () => {
    // facebook and tiktok forced to TBC so this proves isolation between social
    // fields, rather than happening to pass because the fixture has all three filled.
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({
        ...SITE_FIXTURE,
        social: { facebook: TBC, instagram: 'https://instagram.com/roomycreations', tiktok: TBC },
      }),
    }))
    await renderFooter()
    expect(screen.getByRole('heading', { name: 'Follow' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/roomycreations',
    )
    expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument()
  })

  it('compresses a social icon on tap', async () => {
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({
        ...SITE_FIXTURE,
        social: { facebook: TBC, instagram: 'https://instagram.com/roomycreations', tiktok: TBC },
      }),
    }))
    await renderFooter()
    expect(screen.getByRole('link', { name: 'Instagram' }).className).toMatch(/active:scale-95/)
  })

  it('never uses text-white', async () => {
    const { container } = await renderFooter()
    expect(container.innerHTML).not.toMatch(/text-white/)
  })
})
