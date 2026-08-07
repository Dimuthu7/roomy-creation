import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'

async function renderFigures() {
  const { Figures } = await import('./Figures')
  return render(<Figures />)
}

beforeEach(() => {
  vi.resetModules()
  vi.doUnmock('@/data/site')
})

// D9: the probe showed useInView(ref, {once:true, amount:0.4}) resolves to true on the
// very first render under our stubbed IntersectionObserver, so no test here can tell
// "counts when scrolled into view" apart from "counts immediately". The scroll trigger
// itself needs a real browser; what follows only asserts what is actually testable.
//
// F4: the client's rule is "if a figure is unknown, cut that row and run three cuts" —
// the same ruling Task 14 applied to Materials (D4), which the original Figures
// component did not carry across. Every SITE.figures value is [TBC] today, so unknown
// figures must be cut rather than rendered as a label over an em dash.
describe('Figures', () => {
  it('renders nothing while every figure is unknown, rather than a strip of em dashes', async () => {
    setPrefersReducedMotion(true)
    const { container } = await renderFigures()
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('cuts unknown rows and keeps only the figures that are known', async () => {
    setPrefersReducedMotion(true)
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: { ...actual.SITE, figures: { ...actual.SITE.figures, yearsInBusiness: 7 } },
      }
    })
    await renderFigures()
    expect(screen.getByText('Years in business')).toBeInTheDocument()
    expect(screen.queryByText('Homes and apartments fitted')).not.toBeInTheDocument()
    expect(screen.queryByText('Units delivered')).not.toBeInTheDocument()
    expect(screen.queryByText('Districts we install in')).not.toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders the real figure once SITE.figures has a known number, with no em dash beside it', async () => {
    setPrefersReducedMotion(true)
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: { ...actual.SITE, figures: { ...actual.SITE.figures, yearsInBusiness: 7 } },
      }
    })
    await renderFigures()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders every known figure and lists them in DOM order: years, homes, units, districts', async () => {
    setPrefersReducedMotion(true)
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: {
          ...actual.SITE,
          figures: { yearsInBusiness: 7, homesFitted: 120, unitsDelivered: 400, districtsCovered: 9 },
        },
      }
    })
    const { container } = await renderFigures()
    for (const label of [
      'Years in business',
      'Homes and apartments fitted',
      'Units delivered',
      'Districts we install in',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    const text = container.textContent ?? ''
    const yearsAt = text.indexOf('Years in business')
    const homesAt = text.indexOf('Homes and apartments fitted')
    const unitsAt = text.indexOf('Units delivered')
    const districtsAt = text.indexOf('Districts we install in')
    expect(yearsAt).toBeGreaterThanOrEqual(0)
    expect(homesAt).toBeGreaterThan(yearsAt)
    expect(unitsAt).toBeGreaterThan(homesAt)
    expect(districtsAt).toBeGreaterThan(unitsAt)
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark region.
  // This is a stat strip, not prose with a heading of its own, so the section earns
  // its name from aria-label rather than a visible <h2> (see brief §5).
  it('exposes an accessible name on the section once it has something to show', async () => {
    setPrefersReducedMotion(true)
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: { ...actual.SITE, figures: { ...actual.SITE.figures, yearsInBusiness: 7 } },
      }
    })
    await renderFigures()
    expect(screen.getByRole('region', { name: 'Figures' })).toBeInTheDocument()
  })
})
