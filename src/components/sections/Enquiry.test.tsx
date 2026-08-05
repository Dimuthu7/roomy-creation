import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'

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

  it('never prints the [TBC] sentinel while SITE fields are unconfirmed', async () => {
    const { container } = await renderEnquiry()
    expect(container.textContent).not.toContain('[TBC]')
  })

  it('does not render a WhatsApp link while the number is [TBC], the value SITE has today', async () => {
    await renderEnquiry()
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull()
  })

  it('does not render Facebook, Instagram or TikTok links while those fields are [TBC]', async () => {
    await renderEnquiry()
    expect(screen.queryByRole('link', { name: /facebook/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /instagram/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /tiktok/i })).toBeNull()
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
