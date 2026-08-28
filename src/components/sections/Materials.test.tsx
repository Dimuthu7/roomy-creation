import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TBC } from '@/lib/tbc'
import { setPrefersReducedMotion } from '@/test/browserStubs'

async function renderMaterials() {
  const { Materials } = await import('./Materials')
  return render(<Materials />)
}

beforeEach(() => {
  vi.resetModules()
  vi.doUnmock('@/data/specs')
})

describe('Materials', () => {
  it('carries id="materials"', async () => {
    await renderMaterials()
    expect(document.getElementById('materials')).not.toBeNull()
  })

  it('carries the approved heading', async () => {
    await renderMaterials()
    expect(screen.getByRole('heading', { name: 'What it is made of' })).toBeInTheDocument()
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region, even when it contains a heading — the section itself needs
  // aria-labelledby pointing at that heading (brief §5).
  it('gives the section its accessible name from the heading', async () => {
    await renderMaterials()
    expect(screen.getByRole('region', { name: 'What it is made of' })).toBeInTheDocument()
  })

  // D4: the client's rule is "if a figure is unknown, cut that row and run three
  // cuts" — not hide the value and leave the label floating over empty space. All six
  // MATERIAL_SPECS are [TBC] today, so the whole list must be absent, not present with
  // six empty rows.
  it('never prints the [TBC] sentinel', async () => {
    const { container } = await renderMaterials()
    expect(container.textContent).not.toContain('[TBC]')
  })

  // Forced to [TBC] explicitly rather than relying on specs.ts's ambient state, which
  // stopped being all-TBC once placeholder material specs were entered.
  it('renders no spec list at all while every spec is unknown', async () => {
    vi.doMock('@/data/specs', async () => {
      const actual = await vi.importActual<typeof import('@/data/specs')>('@/data/specs')
      return {
        ...actual,
        MATERIAL_SPECS: actual.MATERIAL_SPECS.map((s) => ({ ...s, value: TBC })),
      }
    })
    await renderMaterials()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders only the specs with a known value, and omits the rest entirely', async () => {
    vi.doMock('@/data/specs', async () => {
      const actual = await vi.importActual<typeof import('@/data/specs')>('@/data/specs')
      return {
        ...actual,
        MATERIAL_SPECS: [
          { slot: 'edge', label: 'Board type and thickness', value: '18mm melamine-faced board' },
          { slot: 'hinge', label: 'Hinge and runner, with cycle rating', value: '[TBC]' },
        ],
      }
    })
    await renderMaterials()
    expect(screen.getByText('Board type and thickness')).toBeInTheDocument()
    expect(screen.getByText('18mm melamine-faced board')).toBeInTheDocument()
    expect(screen.queryByText('Hinge and runner, with cycle rating')).not.toBeInTheDocument()
  })

  // D7: a non-interactive list item with tabIndex={0} makes six dead keyboard stops
  // that only toggle opacity on content already visible. There should be nothing to
  // tab to here — `tabIndex === -1` is the real invariant (framer-motion's `whileTap`
  // otherwise auto-injects tabIndex=0 on mount, so an explicit -1 overriding that is
  // the correct row here, not the total absence of a tabindex attribute).
  it('does not turn spec rows into keyboard tab stops', async () => {
    vi.doMock('@/data/specs', async () => {
      const actual = await vi.importActual<typeof import('@/data/specs')>('@/data/specs')
      return {
        ...actual,
        MATERIAL_SPECS: [{ slot: 'edge', label: 'Board type and thickness', value: '18mm board' }],
      }
    })
    const { container } = await renderMaterials()
    const items = container.querySelectorAll('li')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.tabIndex).toBe(-1)
    }
  })

  // D2: pure white is not in the brand palette. text-paper carries display type on
  // navy, never text-white.
  it('never uses text-white', async () => {
    const { container } = await renderMaterials()
    expect(container.innerHTML).not.toMatch(/text-white/)
  })

  it('gives each row an icon', async () => {
    const { container } = await renderMaterials()
    const items = container.querySelectorAll('li')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.querySelector('svg')).not.toBeNull()
    }
  })

  // Not styled via `:hover` alone — a bordered box with a flat navy fill read as an
  // empty outline rather than something a visitor could touch, on the mobile view
  // this section actually ships on.
  it('brightens a row’s border and background on press, a colour change so it still plays under reduced motion', async () => {
    const { container } = await renderMaterials()
    const item = container.querySelector('li') as HTMLElement
    expect(item.className).toMatch(/active:border-teal\/60/)
    expect(item.className).toMatch(/active:bg-teal\/15/)

    setPrefersReducedMotion(true)
    const { container: reducedContainer } = await renderMaterials()
    const reducedItem = reducedContainer.querySelector('li') as HTMLElement
    expect(reducedItem.className).toMatch(/active:border-teal\/60/)
    expect(reducedItem.className).toMatch(/active:bg-teal\/15/)
  })
})
