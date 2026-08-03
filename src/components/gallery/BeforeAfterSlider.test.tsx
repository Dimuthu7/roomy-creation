import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeforeAfterSlider } from './BeforeAfterSlider'
import { WORKS } from '@/data/works'

const withBefore = WORKS.find((w) => w.beforeImage)!
const withoutBefore = WORKS.find((w) => !w.beforeImage)!

/**
 * jsdom performs no layout, so every element measures 0x0 and the drag maths divides by
 * zero. Giving the frame a real rect is what makes a drag assertion mean anything —
 * without it the percentage is Infinity, clampPercent maps it to 50, and 50 is the
 * starting value, so a broken implementation looks identical to a working one.
 */
function stubFrameGeometry(frame: HTMLElement, left = 0, width = 400): void {
  frame.getBoundingClientRect = () =>
    ({ left, width, top: 0, height: 300, right: left + width, bottom: 300, x: left, y: 0,
       toJSON: () => ({}) }) as DOMRect
}

function frameOf(slider: HTMLElement): HTMLElement {
  const frame = slider.parentElement
  if (!frame) throw new Error('slider has no frame parent')
  return frame
}

describe('BeforeAfterSlider', () => {
  it('renders both images when a before shot exists', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('falls back to the single image when there is no before shot', () => {
    render(<BeforeAfterSlider work={withoutBefore} />)
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('exposes a labelled slider starting at the midpoint', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
    expect(slider).toHaveAccessibleName(/compare/i)
  })

  it('moves with the arrow keys, so it is usable without a pointer', async () => {
    const user = userEvent.setup()
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowRight}')
    expect(slider).toHaveAttribute('aria-valuenow', '52')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(slider).toHaveAttribute('aria-valuenow', '48')
  })

  it('clamps at the ends rather than wrapping', async () => {
    const user = userEvent.setup()
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{Home}')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    await user.keyboard('{ArrowLeft}')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
  })

  it('describes the before image as the bare wall', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    expect(screen.getByAltText(/before installation/i)).toBeInTheDocument()
  })

  // Everything above this line reads aria-valuenow. A component that tracked the value
  // perfectly and never moved the picture would pass all of it — so these two assert that
  // the number actually reaches the DOM.
  it('moves the reveal and the handle to match the value', async () => {
    const user = userEvent.setup()
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowRight}')
    expect(slider.style.left).toBe('52%')
    const reveal = screen.getByTestId('after-reveal')
    expect(reveal.style.clipPath).toBe('inset(0 0 0 52%)')
  })

  it('shows the finished unit to the right of the handle, bare wall to the left', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    // The after image is clipped from the LEFT by the percentage, so it occupies the
    // region right of the handle. Reversing the inset would put the finished unit on the
    // wrong side of the divider.
    const reveal = screen.getByTestId('after-reveal')
    expect(reveal.style.clipPath).toBe('inset(0 0 0 50%)')
    expect(reveal.querySelector('img')?.getAttribute('alt')).toContain('Built-in wardrobe')
  })

  // The drag is the whole point of the component and nothing above touches it.
  it('sets the position from a pointer press', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    stubFrameGeometry(frameOf(slider))
    fireEvent.pointerDown(frameOf(slider), { pointerId: 1, clientX: 100 })
    expect(slider).toHaveAttribute('aria-valuenow', '25')
  })

  it('measures from the frame edge, not the viewport edge', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    const frame = frameOf(slider)
    // A frame that does not start at x=0 is the normal case in a real lightbox. Every
    // other drag test stubs left=0, which makes the `- rect.left` term inert and a
    // dropped offset invisible.
    stubFrameGeometry(frame, 100, 400)
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 200 })
    expect(slider).toHaveAttribute('aria-valuenow', '25')
  })

  it('follows a drag while the pointer is captured', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    const frame = frameOf(slider)
    stubFrameGeometry(frame)
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 100 })
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 300 })
    expect(slider).toHaveAttribute('aria-valuenow', '75')
  })

  it('ignores pointer movement that is not part of a drag', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    const frame = frameOf(slider)
    stubFrameGeometry(frame)
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 300 })
    expect(slider).toHaveAttribute('aria-valuenow', '50')
  })

  it('clamps a drag past either edge', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    const frame = frameOf(slider)
    stubFrameGeometry(frame)
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: -50 })
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 900 })
    expect(slider).toHaveAttribute('aria-valuenow', '100')
  })
})
