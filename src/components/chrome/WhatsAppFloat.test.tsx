import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { TBC } from '@/lib/tbc'
import { useSiteData } from '@/context/SiteData'
import { SITE_FIXTURE, WORKS_FIXTURE } from '@/test/fixtures'
import { WhatsAppFloat } from './WhatsAppFloat'

vi.mock('@/context/SiteData', () => ({ useSiteData: vi.fn() }))

function withWhatsapp(whatsappNumber: string | typeof TBC) {
  vi.mocked(useSiteData).mockReturnValue({
    site: { ...SITE_FIXTURE, whatsappNumber },
    works: WORKS_FIXTURE,
  })
}

beforeEach(() => {
  withWhatsapp('94771234567')
})

describe('WhatsAppFloat', () => {
  // Forced to [TBC] explicitly rather than relying on the fixture's default: this
  // proves whatsappUrl(...) returning null renders nothing, not that the fixture
  // happens to be unset.
  it('renders nothing while site.whatsappNumber is [TBC]', () => {
    withWhatsapp(TBC)
    const { container } = render(<WhatsAppFloat />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a link named "Message us on WhatsApp" once the number is configured', () => {
    render(<WhatsAppFloat />)
    expect(screen.getByRole('link', { name: 'Message us on WhatsApp' })).toBeInTheDocument()
  })

  it('links to the wa.me number, opened in a new tab safely', () => {
    render(<WhatsAppFloat />)
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/94771234567'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  // A float over a modal is a defect: Lightbox's portal is z-50, so this has to sit
  // under it.
  it('sits below the lightbox z-index', () => {
    render(<WhatsAppFloat />)
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link.className).toMatch(/z-40/)
    expect(link.className).not.toMatch(/z-50/)
  })

  it('applies no entrance transform under reduced motion', () => {
    setPrefersReducedMotion(true)
    render(<WhatsAppFloat />)
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link.style.opacity).toBe('')
    expect(link.style.transform).toBe('')
  })

  it('slides in from below at full motion, then settles fully visible', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    render(<WhatsAppFloat />)
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link.style.opacity).toBe('0')
    await waitFor(() => expect(link.style.opacity).toBe('1'), { timeout: 2000 })
  })

  it('never uses text-white', () => {
    const { container } = render(<WhatsAppFloat />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })
})
