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
describe('Figures', () => {
  it('renders a label for each of the four figures', async () => {
    await renderFigures()
    for (const label of [
      'Years in business',
      'Homes and apartments fitted',
      'Units delivered',
      'Districts we install in',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('lists the four labels in DOM order: years, homes, units, districts', async () => {
    const { container } = await renderFigures()
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

  // D6/M6: every SITE.figures value is [TBC] today. A raw "[TBC]" sentinel must never
  // reach the page — it renders an em dash instead.
  it('shows an em dash instead of the [TBC] sentinel while every figure is unknown', async () => {
    setPrefersReducedMotion(true)
    await renderFigures()
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(4)
  })

  // D10: the probe measured ~617ms to settle at full motion, but immediate and
  // synchronous under reduced motion — the deterministic way to assert a real figure
  // without needing waitFor.
  it('renders the real figure once SITE.figures has a known number', async () => {
    setPrefersReducedMotion(true)
    vi.doMock('@/data/site', async () => {
      const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
      return {
        SITE: { ...actual.SITE, figures: { ...actual.SITE.figures, yearsInBusiness: 7 } },
      }
    })
    await renderFigures()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
  })
})
