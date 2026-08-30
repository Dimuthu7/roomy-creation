import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildLocalBusinessSchema } from '@/lib/schema'
import { useSiteData } from '@/context/SiteData'
import { SITE_FIXTURE, WORKS_FIXTURE } from '@/test/fixtures'

vi.mock('@/context/SiteData', () => ({ useSiteData: vi.fn() }))

async function renderPage() {
  const { default: Home } = await import('./page')
  return render(await Home())
}

beforeEach(() => {
  vi.resetModules()
  vi.doUnmock('@/data/site')
  vi.doMock('@/data/site', () => ({ getSiteConfig: async () => SITE_FIXTURE }))
  vi.mocked(useSiteData).mockReturnValue({ site: SITE_FIXTURE, works: WORKS_FIXTURE })
})

describe('Home page assembly', () => {
  it('renders exactly one h1 on the page', async () => {
    await renderPage()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders <main id="main">, the skip link target', async () => {
    const { container } = await renderPage()
    const main = container.querySelector('main')
    expect(main).not.toBeNull()
    expect(main).toHaveAttribute('id', 'main')
  })

  it('carries every load-bearing anchor id: top, work, how, materials, enquiry', async () => {
    await renderPage()
    for (const id of ['top', 'work', 'how', 'materials', 'enquiry']) {
      expect(document.getElementById(id)).not.toBeNull()
    }
  })

  // Section order: Hero · Position (carries the stats now) · WhatWeMake · Work ·
  // Film · HowWeWork · Materials · Enquiry.
  it('lays out the eight sections in the approved order', async () => {
    await renderPage()
    const top = document.getElementById('top')!
    const position = screen.getByRole('region', { name: 'Position' })
    const whatWeMake = screen.getByRole('region', { name: 'What we make' })
    const work = document.getElementById('work')!
    const film = screen.getByRole('region', { name: 'Measured on site.' })
    const how = document.getElementById('how')!
    const materials = document.getElementById('materials')!
    const enquiry = document.getElementById('enquiry')!

    const order = [top, position, whatWeMake, work, film, how, materials, enquiry]
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  // EnquiryPrefillProvider's default context value is deliberately inert. If page.tsx
  // forgets the provider, the lightbox's "get a quote for this" button silently does
  // nothing — no crash, no failing test unless this one exists.
  it('wraps the page in EnquiryPrefillProvider, so the lightbox can prefill the enquiry form', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getAllByRole('button', { name: /Built-in wardrobe/ })[0])
    await user.click(
      screen.getByRole('button', { name: 'Enquire about something like this' }),
    )
    const enquirySection = document.getElementById('enquiry') as HTMLElement
    const checkbox = within(enquirySection).getByRole('checkbox', { name: /wardrobe/i })
    expect(checkbox).toBeChecked()
  })

  // json-ld.md:31-36: a native <script type="application/ld+json">, with `<`
  // replaced by its unicode escape — the doc calls out the XSS vector explicitly.
  it('renders the LocalBusiness JSON-LD script with the XSS-safe escape applied', async () => {
    const { container } = await renderPage()
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const expected = JSON.stringify(buildLocalBusinessSchema(SITE_FIXTURE)).replace(/</g, '\\u003c')
    expect(script!.innerHTML).toBe(expected)
  })

  it('renders exactly one JSON-LD script, not one per section', async () => {
    const { container } = await renderPage()
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
  })

  // The fixture carries no '<', so the escape assertion above would pass even with
  // the .replace() call deleted — proven by mutation testing. This test forces a
  // '<' through a real site field so the escape has something to actually do.
  it('escapes a literal "<" reaching the JSON-LD payload through site data', async () => {
    vi.doMock('@/data/site', () => ({
      getSiteConfig: async () => ({ ...SITE_FIXTURE, city: '</script><script>alert(1)</script>' }),
    }))
    const { container } = await renderPage()
    const script = container.querySelector('script[type="application/ld+json"]')!
    expect(script.innerHTML).not.toContain('<script>')
    expect(script.innerHTML).toContain('\\u003cscript>')
  })
})
