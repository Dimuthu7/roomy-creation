import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Lightbox } from './Lightbox'
import { EnquiryPrefillProvider, useEnquiryPrefill } from '@/context/EnquiryPrefill'
import { WORKS } from '@/data/works'
import { workAlt } from '@/lib/workAlt'
import { setPrefersReducedMotion, getScrollIntoViewCalls } from '@/test/browserStubs'

const withoutBeforeIndex = WORKS.findIndex((w) => !w.beforeImage)
const fourFiveIndex = WORKS.findIndex((w) => !w.beforeImage && w.ratio === '4:5')

function setup(overrides: { index?: number; onClose?: () => void; onIndexChange?: (i: number) => void } = {}) {
  const onClose = overrides.onClose ?? vi.fn()
  const onIndexChange = overrides.onIndexChange ?? vi.fn()
  const index = overrides.index ?? 0
  const utils = render(
    <EnquiryPrefillProvider>
      <button type="button">outside</button>
      <Lightbox index={index} onClose={onClose} onIndexChange={onIndexChange} />
    </EnquiryPrefillProvider>,
  )
  return { onClose, onIndexChange, ...utils }
}

function NeedsProbe() {
  const { needs } = useEnquiryPrefill()
  return <div data-testid="needs">{needs.join(',')}</div>
}

describe('Lightbox', () => {
  it('renders as a modal dialog with an accessible name', () => {
    setup()
    expect(screen.getByRole('dialog', { name: WORKS[0].title })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('right arrow calls onIndexChange(1)', async () => {
    const user = userEvent.setup()
    const { onIndexChange } = setup()
    await user.keyboard('{ArrowRight}')
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  it('left arrow from index 0 wraps to the last index', async () => {
    const user = userEvent.setup()
    const { onIndexChange } = setup()
    await user.keyboard('{ArrowLeft}')
    expect(onIndexChange).toHaveBeenCalledWith(WORKS.length - 1)
  })

  it('shows the compare slider for a work that has a before image', () => {
    setup()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('falls back cleanly for a work that has none', () => {
    setup({ index: withoutBeforeIndex })
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getByAltText(workAlt(WORKS[withoutBeforeIndex]))).toBeInTheDocument()
  })

  it('renders the known spec row and omits the unknown ones', () => {
    setup()
    expect(screen.getByText('Project type')).toBeInTheDocument()
    expect(screen.queryByText('Materials and finish')).not.toBeInTheDocument()
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
  })

  it('offers a single enquire action named "Enquire about something like this"', () => {
    setup()
    expect(
      screen.getAllByRole('button', { name: 'Enquire about something like this' }),
    ).toHaveLength(1)
  })

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    setup()
    const outside = screen.getByRole('button', { name: 'outside' })
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(document.activeElement).not.toBe(outside)
    }
  })

  it('restores focus on unmount to the element that was focused before opening', () => {
    render(<button type="button">trigger</button>)
    const trigger = screen.getByRole('button', { name: 'trigger' })
    trigger.focus()
    const { unmount } = setup()
    unmount()
    expect(document.activeElement).toBe(trigger)
  })

  it('locks background scroll while open and restores the previous overflow on unmount', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = setup()
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('the Close button calls onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('the Previous and Next buttons call onIndexChange with the wrapped index', async () => {
    const user = userEvent.setup()
    const { onIndexChange } = setup({ index: 0 })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onIndexChange).toHaveBeenCalledWith(1)
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onIndexChange).toHaveBeenCalledWith(WORKS.length - 1)
  })

  it('the enquire button records the need and closes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EnquiryPrefillProvider>
        <NeedsProbe />
        <button type="button">outside</button>
        <Lightbox index={0} onClose={onClose} onIndexChange={vi.fn()} />
      </EnquiryPrefillProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Enquire about something like this' }))
    expect(screen.getByTestId('needs')).toHaveTextContent(WORKS[0].category)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders through a portal', () => {
    const { container } = setup()
    const dialog = screen.getByRole('dialog')
    expect(container.contains(dialog)).toBe(false)
    expect(document.body.contains(dialog)).toBe(true)
  })

  it("the fallback uses the work's own ratio", () => {
    setup({ index: fourFiveIndex })
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('.aspect-\\[3\\/2\\]')).toBeNull()
    expect(dialog.querySelector('.aspect-\\[4\\/5\\]')).not.toBeNull()
  })

  it('prefill scrolls instantly under reduced motion', async () => {
    setPrefersReducedMotion(true)
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EnquiryPrefillProvider>
        <div id="enquiry" />
        <button type="button">outside</button>
        <Lightbox index={0} onClose={onClose} onIndexChange={vi.fn()} />
      </EnquiryPrefillProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Enquire about something like this' }))
    const calls = getScrollIntoViewCalls()
    expect(calls[calls.length - 1].arg).toEqual({ behavior: 'auto' })
  })
})
