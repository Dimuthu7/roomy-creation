import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
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

  // The backward wrap above is the only one the other tests can see: every forward
  // assertion runs at index 0, where `nextIndex(0, n)` and a bare `index + 1` agree.
  // Without this, both nextIndex call sites could be replaced by `index + 1` with the
  // whole suite still green.
  it('wraps forward to the first index from the last, by key and by button', async () => {
    const user = userEvent.setup()
    const onIndexChange = vi.fn()
    setup({ index: WORKS.length - 1, onIndexChange })

    await user.keyboard('{ArrowRight}')
    expect(onIndexChange).toHaveBeenCalledWith(0)

    onIndexChange.mockClear()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onIndexChange).toHaveBeenCalledWith(0)
  })

  // The compare handle and the lightbox both bind the arrow keys, and the handle sits
  // inside the dialog. Without the slider stopping propagation, nudging the comparison
  // one step also jumps to the next work — the image the user is comparing disappears
  // out from under them.
  it('leaves the arrow keys to the compare handle while it holds focus', async () => {
    const user = userEvent.setup()
    const { onIndexChange } = setup({ index: 0 })
    const handle = screen.getByRole('slider')
    handle.focus()

    await user.keyboard('{ArrowRight}')

    expect(handle).toHaveAttribute('aria-valuenow', '52')
    expect(onIndexChange).not.toHaveBeenCalled()
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

  // `html`, not `body`, is the browser's actual root scrolling box in standards mode.
  // The original lock only touched `body.style.overflow`, which left `html` free to
  // scroll — that gap is what let the page behind the modal keep moving.
  it('locks background scroll on both html and body while open, and restores the previous overflow of each on unmount', () => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'scroll'
    const { unmount } = setup()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.documentElement.style.overflow).toBe('auto')
    expect(document.body.style.overflow).toBe('scroll')
  })

  // SmoothScroll.tsx's Lenis instance listens for wheel/touch on `window` and calls
  // preventDefault to drive its own scrolling — without this attribute it would
  // intercept scroll gestures made over the modal's own content before the browser
  // ever got to scroll it natively. `data-lenis-prevent` is Lenis's documented escape
  // hatch for exactly this.
  it('marks the dialog so Lenis defers to native scrolling inside it', () => {
    setup()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-lenis-prevent')
  })

  it('the Close button calls onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  // Previously the overlay had no onClick at all, so the only way to close was the
  // explicit Close button or Escape. Checking e.target === e.currentTarget (rather
  // than stopping propagation on the content div) means a click that starts and ends
  // on the backdrop itself closes, while a click on any descendant — which bubbles up
  // with a different e.target — does not.
  it('closes when the backdrop outside the dialog content is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when the dialog content itself is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('heading', { name: WORKS[0].title }))
    expect(onClose).not.toHaveBeenCalled()
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

  // A1: BeforeAfterSlider owns its own `singleFailed`/`beforeFailed`/`afterFailed` flags.
  // The element type and position do not change when `index` does, so without a key React
  // keeps the instance — and its failure flags — across a navigation. One missing photo
  // then suppressed every photo after it: the stand-in re-rendered with the NEXT work's
  // path and no request was ever made for a file that exists.
  it('does not carry one work\'s failed image over to the next', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [index, setIndex] = useState(1)
      return <Lightbox index={index} onClose={vi.fn()} onIndexChange={setIndex} />
    }
    render(<Harness />)

    fireEvent.error(document.querySelector('img')!)
    expect(screen.getByTestId('slider-fallback')).toHaveTextContent(`Image slot: ${WORKS[1].image}`)

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.queryByTestId('slider-fallback')).not.toBeInTheDocument()
    expect(document.querySelector('img')).toBeInTheDocument()
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
