import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { SITE_FIXTURE, WORKS_FIXTURE } from '@/test/fixtures'
import { SiteChrome } from './SiteChrome'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))
vi.mock('@/app/admin/actions', () => ({ logout: vi.fn() }))
vi.mock('./SmoothScroll', () => ({ SmoothScroll: () => <div data-testid="smooth-scroll" /> }))
vi.mock('./CustomCursor', () => ({ CustomCursor: () => <div data-testid="custom-cursor" /> }))
vi.mock('./WhatsAppFloat', () => ({ WhatsAppFloat: () => <div data-testid="whatsapp-float" /> }))
vi.mock('./ScrollToTop', () => ({ ScrollToTop: () => <div data-testid="scroll-to-top" /> }))

function renderChrome(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname)
  return render(
    <SiteChrome site={SITE_FIXTURE} works={WORKS_FIXTURE} footer={<div data-testid="footer" />}>
      <div data-testid="page-content" />
    </SiteChrome>,
  )
}

describe('SiteChrome', () => {
  it('renders the full marketing chrome — nav, footer, WhatsApp — on a marketing route', () => {
    renderChrome('/')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
    expect(screen.getByTestId('whatsapp-float')).toBeInTheDocument()
    expect(screen.getByTestId('page-content')).toBeInTheDocument()
  })

  it('drops the footer and WhatsApp float, but keeps the nav, on a protected admin route', () => {
    renderChrome('/admin/site-details')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('whatsapp-float')).not.toBeInTheDocument()
  })

  it('renders no nav, footer, or WhatsApp float at all on the login screen', () => {
    renderChrome('/admin/login')
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('whatsapp-float')).not.toBeInTheDocument()
  })

  it('always mounts SmoothScroll and ScrollToTop, admin or not', () => {
    renderChrome('/admin/site-details')
    expect(screen.getByTestId('smooth-scroll')).toBeInTheDocument()
    expect(screen.getByTestId('scroll-to-top')).toBeInTheDocument()
  })
})
