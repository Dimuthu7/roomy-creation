import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'
import { useSiteData } from '@/context/SiteData'
import { SITE_FIXTURE, WORKS_FIXTURE, TESTIMONIALS_FIXTURE } from '@/test/fixtures'
import { Enquiry } from './Enquiry'

vi.mock('@/context/SiteData', () => ({ useSiteData: vi.fn() }))

beforeEach(() => {
  vi.mocked(useSiteData).mockReturnValue({
    site: SITE_FIXTURE,
    works: WORKS_FIXTURE,
    testimonials: TESTIMONIALS_FIXTURE,
  })
})

function renderEnquiry() {
  return render(
    <EnquiryPrefillProvider>
      <Enquiry />
    </EnquiryPrefillProvider>,
  )
}

describe('Enquiry', () => {
  it('carries id="enquiry", the exact string the prefill scroll target depends on', () => {
    renderEnquiry()
    expect(document.getElementById('enquiry')).not.toBeNull()
  })

  it('renders the quote form inside the section', () => {
    renderEnquiry()
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeInTheDocument()
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region, even when it contains a heading — the section itself needs
  // aria-labelledby pointing at that heading (brief §5).
  it('gives the section its accessible name from the heading', () => {
    renderEnquiry()
    expect(screen.getByRole('region', { name: 'Get a quotation' })).toBeInTheDocument()
  })

  // The measurement-visit address and WhatsApp/social block used to be duplicated here
  // and in the footer. It now lives only in the footer (Footer.test.tsx covers it), so
  // this section should render nothing under those headings.
  it('does not duplicate the footer\'s measurement-visit or WhatsApp/social content', () => {
    renderEnquiry()
    expect(screen.queryByRole('heading', { name: 'Measurement visit' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'WhatsApp' })).toBeNull()
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull()
  })
})
