import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TBC } from '@/lib/tbc'

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

  // D5: asserting only the *absence* of apologetic words is vacuous — an empty
  // BOARD_ARGUMENT array would pass that check too. Assert every line is present
  // verbatim first, then the register.
  it('makes the board argument in the four approved lines, verbatim', async () => {
    await renderMaterials()
    const argument = screen.getByTestId('board-argument')
    const lines = [
      'Engineered board is wood fibre pressed with resin into a panel of consistent density, then faced with melamine.',
      'It does not have a grain direction, so a tall door stays flat where a solid timber one cups.',
      'Sri Lankan humidity swings year round. Solid wood moves with it. A sealed, edge-banded panel does not.',
      'Where there is water, under sinks and along a kitchen run, we use moisture-resistant board rather than standard board.',
    ]
    for (const line of lines) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
    const text = argument.textContent ?? ''
    expect(text).not.toMatch(/sorry|unfortunately|just as good|cheap alternative/i)
    expect(text).not.toContain('!')
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
  // tab to here.
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
      expect(item).not.toHaveAttribute('tabindex')
    }
  })

  // D2: pure white is not in the brand palette. text-paper carries display type on
  // navy, never text-white.
  it('never uses text-white', async () => {
    const { container } = await renderMaterials()
    expect(container.innerHTML).not.toMatch(/text-white/)
  })
})
