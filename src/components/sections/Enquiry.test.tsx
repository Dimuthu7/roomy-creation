import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'
import { TBC } from '@/lib/tbc'

async function renderEnquiry() {
  const { Enquiry } = await import('./Enquiry')
  return render(
    <EnquiryPrefillProvider>
      <Enquiry />
    </EnquiryPrefillProvider>,
  )
}

beforeEach(() => {
  vi.resetModules()
  // doUnmock, not unmock: this runs inside a test body rather than at module top
  // level, and unmock's hoisting only applies to (and warns about) that static case.
  vi.doUnmock('@/data/site')
})

describe('Enquiry', () => {
  it('carries id="enquiry", the exact string the prefill scroll target depends on', async () => {
    await renderEnquiry()
    expect(document.getElementById('enquiry')).not.toBeNull()
  })

  it('renders the quote form inside the section', async () => {
    await renderEnquiry()
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeInTheDocument()
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region, even when it contains a heading — the section itself needs
  // aria-labelledby pointing at that heading (brief §5).
  it('gives the section its accessible name from the heading', async () => {
    await renderEnquiry()
    expect(screen.getByRole('region', { name: 'Get a quotation' })).toBeInTheDocument()
  })

  it('never prints the [TBC] sentinel while SITE fields are unconfirmed', async () => {
    const { container } = await renderEnquiry()
    expect(container.textContent).not.toContain('[TBC]')
  })

  // Forced explicitly to [TBC] rather than relying on site.ts's ambient state, which
  // stopped being all-TBC once real contact details were entered.
  it('does not render a WhatsApp link while the number is [TBC]', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: TBC } }
    })
    await renderEnquiry()
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull()
  })

  it('does not render Facebook, Instagram or TikTok links while those fields are [TBC]', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, social: { facebook: TBC, instagram: TBC, tiktok: TBC } } }
    })
    await renderEnquiry()
    expect(screen.queryByRole('link', { name: /facebook/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /instagram/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /tiktok/i })).toBeNull()
  })

  // Both blocks forced to [TBC] explicitly, so this proves the heading-earns-its-place
  // gating rather than happening to pass because site.ts has nothing to show today.
  // Rendering a heading anyway leaves a dead subheading on the one section the whole
  // site funnels into — worse than showing nothing at all. The WhatsApp heading is
  // shared with the social row (hasWhatsAppBlock = waUrl !== null || socials.length >
  // 0 in Enquiry.tsx), so social has to be cleared too or the heading survives on
  // Facebook/Instagram/TikTok alone.
  it('omits a contact block entirely rather than leaving its heading dangling', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: {
          ...actual.SITE,
          whatsappNumber: TBC,
          social: { facebook: TBC, instagram: TBC, tiktok: TBC },
          addressLines: TBC,
          city: TBC,
          openingHours: TBC,
        },
      }
    })
    await renderEnquiry()
    expect(screen.queryByRole('heading', { name: 'Measurement visit' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'WhatsApp' })).toBeNull()
  })

  it('shows each heading as soon as that block has something to say', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: { ...actual.SITE, city: 'Colombo', whatsappNumber: '94771234567' },
      }
    })
    await renderEnquiry()
    expect(screen.getByRole('heading', { name: 'Measurement visit' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'WhatsApp' })).toBeInTheDocument()
  })

  it('renders a working WhatsApp link once SITE.whatsappNumber is configured', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: '94771234567' } }
    })
    await renderEnquiry()
    const link = screen.getByRole('link', { name: /whatsapp/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/94771234567'))
  })

  it('renders the measurement-visit address and hours once configured, omitting any field still [TBC]', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: {
          ...actual.SITE,
          addressLines: ['12 Galle Road'],
          city: 'Colombo',
          openingHours: ['Mo-Sa 09:00-18:00'],
        },
      }
    })
    const { container } = await renderEnquiry()
    expect(screen.getByText('12 Galle Road')).toBeInTheDocument()
    expect(screen.getByText('Colombo')).toBeInTheDocument()
    expect(screen.getByText('Mo-Sa 09:00-18:00')).toBeInTheDocument()
    expect(container.textContent).not.toContain('[TBC]')
  })
})
