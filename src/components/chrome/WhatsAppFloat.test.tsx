import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { TBC } from '@/lib/tbc'

async function renderFloat() {
  const { WhatsAppFloat } = await import('./WhatsAppFloat')
  return render(<WhatsAppFloat />)
}

beforeEach(() => {
  vi.resetModules()
  vi.doUnmock('@/data/site')
})

describe('WhatsAppFloat', () => {
  // Forced to [TBC] explicitly rather than relying on site.ts's ambient state: this
  // proves whatsappUrl(...) returning null renders nothing, not that today's data
  // happens to be unset.
  it('renders nothing while SITE.whatsappNumber is [TBC]', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: TBC } }
    })
    const { container } = await renderFloat()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a link named "Message us on WhatsApp" once the number is configured', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: '94771234567' } }
    })
    await renderFloat()
    expect(screen.getByRole('link', { name: 'Message us on WhatsApp' })).toBeInTheDocument()
  })

  it('links to the wa.me number, opened in a new tab safely', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: '94771234567' } }
    })
    await renderFloat()
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/94771234567'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  // A float over a modal is a defect: Lightbox's portal is z-50, so this has to sit
  // under it.
  it('sits below the lightbox z-index', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: '94771234567' } }
    })
    await renderFloat()
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link.className).toMatch(/z-40/)
    expect(link.className).not.toMatch(/z-50/)
  })

  it('applies no entrance transform under reduced motion', async () => {
    setPrefersReducedMotion(true)
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: '94771234567' } }
    })
    await renderFloat()
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link.style.opacity).toBe('')
    expect(link.style.transform).toBe('')
  })

  it('slides in from below at full motion, then settles fully visible', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: '94771234567' } }
    })
    await renderFloat()
    const link = screen.getByRole('link', { name: 'Message us on WhatsApp' })
    expect(link.style.opacity).toBe('0')
    await waitFor(() => expect(link.style.opacity).toBe('1'), { timeout: 2000 })
  })

  it('never uses text-white', async () => {
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return { SITE: { ...actual.SITE, whatsappNumber: '94771234567' } }
    })
    const { container } = await renderFloat()
    expect(container.innerHTML).not.toMatch(/text-white/)
  })
})
