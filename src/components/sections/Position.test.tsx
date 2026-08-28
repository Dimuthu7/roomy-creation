import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { TBC } from '@/lib/tbc'
import { Position } from './Position'

async function renderPositionWithFigures(figures: {
  yearsInBusiness?: number | typeof TBC
  homesFitted?: number | typeof TBC
  unitsDelivered?: number | typeof TBC
  districtsCovered?: number | typeof TBC
}) {
  vi.doMock('@/data/site', async () => {
    const actual = await vi.importActual<typeof import('@/data/site')>('@/data/site')
    return { SITE: { ...actual.SITE, figures: { ...actual.SITE.figures, ...figures } } }
  })
  const { Position: MockedPosition } = await import('./Position')
  return render(<MockedPosition />)
}

beforeEach(() => {
  vi.resetModules()
  vi.doUnmock('@/data/site')
})

// D8: the plan gave no copy for this section at all. These six lines (the three
// originally approved-pending, plus three added later as a second beat) are the
// implementer's, not the client's, and are flagged for sign-off in the Task 14 brief
// and docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md — they are
// asserted verbatim here so a future rewrite cannot silently drift them further, the
// same failure that hit Tasks 12 and 13.
const LINES = [
  'We make built-in furniture for homes, apartments, hotels and offices.',
  'Every piece is measured on site before anything is cut.',
  'A standard-size unit leaves gaps. A fitted one does not.',
  'Every material is chosen to last, not just to look good on day one.',
  'The same team measures, builds and installs — start to finish.',
  'Fit it once. It will not need fitting again.',
]

describe('Position', () => {
  it('carries all six lines verbatim, in order', () => {
    const { container } = render(<Position />)
    for (const line of LINES) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    const text = container.textContent ?? ''
    const positions = LINES.map((line) => text.indexOf(line))
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1])
    }
  })

  it('says nothing else — no invented copy beyond the six approved lines', () => {
    const { container } = render(<Position />)
    const points = container.querySelector('[data-testid="position-points"]') as HTMLElement
    expect(points.querySelectorAll('p')).toHaveLength(6)
  })

  it('never uses text-white', () => {
    const { container } = render(<Position />)
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region. This section is display lines with no heading of its own (a heading
  // over them would be noise, per the brief), so it earns its accessible name from
  // aria-label instead of a visible <h2> (brief §5).
  it('exposes an accessible name on the section, with no visible heading', () => {
    render(<Position />)
    expect(screen.getByRole('region', { name: 'Position' })).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  // Hero's scroll cue targets #position — the section straight after the hero.
  it('carries id="position" so it can be scrolled to directly', () => {
    render(<Position />)
    expect(document.getElementById('position')).not.toBeNull()
  })

  describe('at full motion (pinned scroll reveal)', () => {
    // Point 0 has both a main and a sub line — they must load together on the very
    // first render, not as two separate scroll steps. Points 1-3 wait for scroll.
    it('shows only the first point (main + its sub) on initial render — the rest wait for scroll', () => {
      const { container } = render(<Position />)
      const points = container.querySelector('[data-testid="position-points"]') as HTMLElement
      const paragraphs = [...points.querySelectorAll('p')] as HTMLElement[]
      expect(paragraphs).toHaveLength(6)
      expect(paragraphs[0].style.opacity).toBe('1') // point 0 main
      expect(paragraphs[1].style.opacity).toBe('1') // point 0 sub
      for (const p of paragraphs.slice(2)) {
        expect(p.style.opacity).toBe('0')
      }
    })

    it('pins the section for a scroll distance proportional to the point count', () => {
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      // STEP_VH (55) * 4 points
      expect(section.style.height).toBe('220vh')
      expect(section.querySelector('.sticky')).not.toBeNull()
    })

    it('advances which point is visible as the section scrolls past', async () => {
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      section.getBoundingClientRect = () =>
        ({
          top: -2000,
          height: 3300,
          bottom: 1300,
          left: 0,
          right: 0,
          x: 0,
          y: -2000,
          width: 0,
          toJSON() {},
        }) as DOMRect
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
      fireEvent.scroll(window)
      await waitFor(() => {
        const paragraphs = [...container.querySelectorAll('p')] as HTMLElement[]
        const activeIndex = paragraphs.findIndex((p) => p.style.opacity === '1')
        expect(activeIndex).toBeGreaterThan(0)
      })
    })
  })

  describe('under reduced motion or on mobile (compact fallback)', () => {
    it('renders every line at full opacity, with no pinning, under reduced motion', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      expect(section.style.height).toBe('')
      const points = container.querySelector('[data-testid="position-points"]') as HTMLElement
      expect(points.querySelectorAll('p')).toHaveLength(6)
    })

    it('renders the compact fallback on mobile widths', () => {
      window.innerWidth = 600
      const { container } = render(<Position />)
      const section = container.querySelector('section') as HTMLElement
      expect(section.style.height).toBe('')
      const points = container.querySelector('[data-testid="position-points"]') as HTMLElement
      expect(points.querySelectorAll('p')).toHaveLength(6)
    })

    // Matches the reference the client pointed to (a vertical-timeline portfolio
    // section built on react-vertical-timeline-component): each line pops in with
    // an overshoot bounce rather than a plain fade, and the dot does the same. The
    // line bounces vertically rather than horizontally like the reference's cards —
    // see the overflow note in CompactPosition — so only y (not x) carries the
    // overshoot here.
    it('starts each line offset for a vertical overshoot bounce, on mobile widths', () => {
      window.innerWidth = 600
      const { container } = render(<Position />)
      const p = container.querySelector('[data-testid="position-points"] p') as HTMLElement
      const wrapper = p.parentElement as HTMLElement
      expect(wrapper.style.opacity).toBe('0')
      expect(wrapper.style.transform).toBe('translateY(40px)')
    })

    it('starts each dot scaled down for its own bounce, on mobile widths', () => {
      window.innerWidth = 600
      const { container } = render(<Position />)
      const dot = container.querySelector('[data-testid="position-points"] span.bg-yellow') as HTMLElement
      expect(dot.style.opacity).toBe('0')
      expect(dot.style.transform).toBe('scale(0.5)')
    })

    it('settles every line and dot fully visible, so nothing is left hidden after the bounce', async () => {
      window.innerWidth = 600
      const { container } = render(<Position />)
      const points = container.querySelector('[data-testid="position-points"]') as HTMLElement
      await waitFor(() => {
        for (const p of points.querySelectorAll('p')) {
          expect((p.parentElement as HTMLElement).style.opacity).toBe('1')
        }
        for (const dot of points.querySelectorAll('span.bg-yellow')) {
          expect((dot as HTMLElement).style.opacity).toBe('1')
        }
      })
    })

    // The grid's gap-y and the thread connector's calc(100% + gap) height used to be
    // two hand-matched literals ('3rem' vs gap-y-12) that could silently drift apart.
    // Both now read from the same --pos-gap CSS variable — this locks that coupling
    // so a future edit can't reintroduce a hardcoded, independently-drifting value.
    it('drives the grid gap and the thread connector from one shared variable', () => {
      setPrefersReducedMotion(true)
      const { container } = render(<Position />)
      expect(container.querySelector('[class*="gap-y-[var(--pos-gap)]"]')).toBeInTheDocument()
      const strand = container.querySelector('span[style*="calc(100%"]')
      expect(strand).not.toBeNull()
      expect((strand as HTMLElement).style.height).toContain('var(--pos-gap)')
    })
  })

  describe('stat strip', () => {
    // F4: same "cut unknown rows, render nothing once none survive" rule the client
    // set for Materials (D4) and the original standalone Figures section — carried
    // across now that the stats live in Position.
    it('renders no stat strip while every figure is unknown', async () => {
      setPrefersReducedMotion(true)
      const { container } = await renderPositionWithFigures({
        yearsInBusiness: TBC,
        homesFitted: TBC,
        unitsDelivered: TBC,
        districtsCovered: TBC,
      })
      expect(container.querySelectorAll('[data-testid="position-stat"]')).toHaveLength(0)
    })

    it('cuts unknown stat rows, keeping only the figures that are known', async () => {
      setPrefersReducedMotion(true)
      await renderPositionWithFigures({
        yearsInBusiness: 7,
        homesFitted: TBC,
        unitsDelivered: TBC,
        districtsCovered: TBC,
      })
      expect(screen.getByText('Years in business')).toBeInTheDocument()
      expect(screen.queryByText('Homes and apartments fitted')).not.toBeInTheDocument()
      expect(screen.queryByText('Units delivered')).not.toBeInTheDocument()
      expect(screen.queryByText('Districts we install in')).not.toBeInTheDocument()
    })

    it('renders every known stat, in order: years, homes, units, districts', async () => {
      setPrefersReducedMotion(true)
      const { container } = await renderPositionWithFigures({
        yearsInBusiness: 7,
        homesFitted: 120,
        unitsDelivered: 400,
        districtsCovered: 9,
      })
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

    // Unlike Hero, Position sits on solid bg-navy with no photo overlay to dim it, so
    // it keeps the sub-line's own text-sky rather than Hero's text-paper exception.
    it('keeps the stat label on text-sky, matching this section\'s plain-navy contrast', async () => {
      setPrefersReducedMotion(true)
      await renderPositionWithFigures({ yearsInBusiness: 7 })
      const label = screen.getByText('Years in business')
      expect(label.className).toMatch(/text-sky/)
    })

    describe('at full motion (rides along with the pinned points)', () => {
      it('shows only the first stat alongside point 0 on initial render — the rest wait for scroll', async () => {
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const stats = [...container.querySelectorAll('[data-testid="position-stat"]')] as HTMLElement[]
        expect(stats).toHaveLength(4)
        const wrappers = stats.map((s) => s.parentElement as HTMLElement)
        expect(wrappers[0].style.opacity).toBe('1')
        for (const wrapper of wrappers.slice(1)) {
          expect(wrapper.style.opacity).toBe('0')
        }
      })

      it('adds no extra scroll distance beyond the existing point track', async () => {
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const section = container.querySelector('section') as HTMLElement
        // Unchanged from the points-only track: STEP_VH (55) * 4 points.
        expect(section.style.height).toBe('220vh')
      })

      it('cumulatively reveals stats as points advance — later points keep earlier stats, not replace them', async () => {
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const section = container.querySelector('section') as HTMLElement
        section.getBoundingClientRect = () =>
          ({
            top: -1000,
            height: 3300,
            bottom: 2300,
            left: 0,
            right: 0,
            x: 0,
            y: -1000,
            width: 0,
            toJSON() {},
          }) as DOMRect
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
        fireEvent.scroll(window)
        await waitFor(() => {
          const stats = [...container.querySelectorAll('[data-testid="position-stat"]')] as HTMLElement[]
          const wrappers = stats.map((s) => s.parentElement as HTMLElement)
          expect(wrappers[0].style.opacity).toBe('1')
          expect(wrappers[1].style.opacity).toBe('1')
          expect(wrappers[2].style.opacity).toBe('0')
          expect(wrappers[3].style.opacity).toBe('0')
        })
      })
    })

    describe('under reduced motion (static fallback)', () => {
      it('renders every known stat at full opacity, with no pinning, under reduced motion', async () => {
        setPrefersReducedMotion(true)
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const stats = [...container.querySelectorAll('[data-testid="position-stat"]')] as HTMLElement[]
        expect(stats).toHaveLength(4)
        expect(container.querySelector('[data-testid="position-stats-track"]')).toBeNull()
      })

      // Stats stay in the same compact 2-column (4-column from sm up) block the page
      // already uses — matching the desktop layout.
      it('keeps the stats in the same compact 2-column block, reverting to a row from sm up', async () => {
        setPrefersReducedMotion(true)
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const stat = container.querySelector('[data-testid="position-stat"]') as HTMLElement
        const statGrid = stat.parentElement as HTMLElement
        expect(statGrid.className).toMatch(/grid-cols-2\b/)
        expect(statGrid.className).toMatch(/sm:grid-cols-4\b/)
      })
    })

    // Mobile gets the same scroll-linked mechanism desktop uses for its stats — pinned,
    // cumulative, driven by activeScrollStep — rather than a canned timer that plays
    // once the block is on screen regardless of whether the visitor keeps scrolling.
    // Unlike desktop, it's scoped to the stats alone (no paired point text) and stays
    // in the same compact 2-column block rather than spreading across full screens.
    describe('on mobile (pinned, scroll-linked reveal)', () => {
      it('reveals only the first stat initially — the rest wait for scroll', async () => {
        window.innerWidth = 600
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const stats = [...container.querySelectorAll('[data-testid="position-stat"]')] as HTMLElement[]
        expect(stats).toHaveLength(4)
        const wrappers = stats.map((s) => s.parentElement as HTMLElement)
        expect(wrappers[0].style.opacity).toBe('1')
        for (const wrapper of wrappers.slice(1)) {
          expect(wrapper.style.opacity).toBe('0')
        }
      })

      // An ancestor with any overflow other than visible (including hidden) becomes
      // the nearest "scroll container" position: sticky computes against — and since
      // that ancestor is the section itself, which never scrolls on its own (the
      // *page* scrolls around it), a sticky descendant inside it never actually
      // engages: it just renders at its static top-of-flow position and never
      // centers, which is invisible to jsdom (it doesn't lay out real sticky
      // positioning) but very visible on a real phone as content glued to the top
      // with dead space where the centered pin should be.
      it('does not wrap the pinned stat track in any ancestor with overflow other than visible, which would stop it sticking', async () => {
        window.innerWidth = 600
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const track = container.querySelector('[data-testid="position-stats-track"]') as HTMLElement
        let node: HTMLElement | null = track.parentElement
        while (node && node !== container) {
          expect(node.className).not.toMatch(/overflow-(hidden|auto|scroll|clip)/)
          node = node.parentElement
        }
      })

      it('keeps the stats in the same compact 2-column block, reverting to a row from sm up', async () => {
        window.innerWidth = 600
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const stat = container.querySelector('[data-testid="position-stat"]') as HTMLElement
        const statGrid = stat.parentElement!.parentElement as HTMLElement
        expect(statGrid.className).toMatch(/grid-cols-2\b/)
        expect(statGrid.className).toMatch(/sm:grid-cols-4\b/)
      })

      it('cumulatively reveals stats as the visitor scrolls through the pinned track — later stats keep earlier ones, not replace them', async () => {
        window.innerWidth = 600
        const { container } = await renderPositionWithFigures({
          yearsInBusiness: 2,
          homesFitted: 10,
          unitsDelivered: 20,
          districtsCovered: 3,
        })
        const track = container.querySelector('[data-testid="position-stats-track"]') as HTMLElement
        track.getBoundingClientRect = () =>
          ({
            top: -300,
            height: 1600,
            bottom: 1300,
            left: 0,
            right: 0,
            x: 0,
            y: -400,
            width: 0,
            toJSON() {},
          }) as DOMRect
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
        fireEvent.scroll(window)
        await waitFor(() => {
          const stats = [...container.querySelectorAll('[data-testid="position-stat"]')] as HTMLElement[]
          const wrappers = stats.map((s) => s.parentElement as HTMLElement)
          expect(wrappers[0].style.opacity).toBe('1')
          expect(wrappers[1].style.opacity).toBe('1')
          expect(wrappers[2].style.opacity).toBe('0')
          expect(wrappers[3].style.opacity).toBe('0')
        })
      })
    })
  })
})
