import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { Film } from './Film'
import { CLIP_STARTS, FILM_CARDS } from '@/data/specs'
import { setPrefersReducedMotion } from '@/test/browserStubs'

function video(): HTMLVideoElement {
  return document.querySelector('video') as HTMLVideoElement
}

/**
 * Defines `currentTime` as an own property on the instance rather than assigning
 * through the prototype accessor, so this helper never trips the setter spy that
 * test 4 installs on `HTMLMediaElement.prototype`. It fakes the read path only.
 */
function fireTimeUpdate(el: HTMLVideoElement, time: number) {
  Object.defineProperty(el, 'currentTime', { value: time, configurable: true })
  act(() => {
    el.dispatchEvent(new Event('timeupdate'))
  })
}

describe('Film', () => {
  it('renders the first card before playback starts', () => {
    render(<Film />)
    expect(screen.getByText(FILM_CARDS[0].counter)).toBeInTheDocument()
  })

  it("switches cards from the video's timeupdate event", () => {
    render(<Film />)
    fireTimeUpdate(video(), CLIP_STARTS[1])
    expect(screen.getByText(FILM_CARDS[1].counter)).toBeInTheDocument()
  })

  it('holds the last card to the end of the file', () => {
    render(<Film />)
    fireTimeUpdate(video(), 9999)
    expect(screen.getByText(FILM_CARDS[3].counter)).toBeInTheDocument()
  })

  // The constraint covers the component's whole life, not one dispatch after render,
  // so the spy goes on the prototype before mount and stays up through several
  // timeupdates and a scroll event. A per-element spy installed after render would
  // miss anything the mount effect itself did.
  it('never assigns to currentTime at any point in its life', () => {
    const original = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!
    const setter = vi.fn()
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      configurable: true,
      get: original.get,
      set(this: HTMLMediaElement, value: number) {
        setter(value)
        original.set!.call(this, value)
      },
    })

    // fireTimeUpdate fakes each read by defining currentTime as a non-writable own
    // property on the instance, which after the first call shadows the prototype
    // spy above for every later write. A write against a non-writable property
    // throws instead of reaching that spy — and jsdom, per spec, catches an
    // event-listener exception and reports it as a window error rather than
    // letting it propagate to the dispatchEvent() caller. Watching for that report
    // is what actually catches an assignment made after the first timeupdate.
    const onWindowError = vi.fn()
    window.addEventListener('error', onWindowError)

    try {
      render(<Film />)
      const el = video()
      for (const t of [1, 4.5, 9.2, 13.8, 20]) {
        fireTimeUpdate(el, t)
      }
      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })
      expect(setter).not.toHaveBeenCalled()
      expect(onWindowError).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('error', onWindowError)
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', original)
    }
  })

  it('is muted, looping and inline so it can autoplay', () => {
    render(<Film />)
    const el = video()
    expect(el.muted).toBe(true)
    expect(el.loop).toBe(true)
    expect(el).toHaveAttribute('playsinline')
  })

  it("renders card 01's known line and omits its unknown figure", () => {
    render(<Film />)
    expect(screen.getByText(FILM_CARDS[0].line as string)).toBeInTheDocument()
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
  })

  it('splits the headline above and below the frame so type never overlaps footage', () => {
    const { container } = render(<Film />)
    const top = container.querySelector('[data-film-headline="top"]')
    const bottom = container.querySelector('[data-film-headline="bottom"]')
    const el = video()
    expect(top).not.toBeNull()
    expect(bottom).not.toBeNull()
    expect(top!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(el.compareDocumentPosition(bottom!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // CLIP_STARTS[2] is the real boundary the data module defines. Asserting against it
  // (rather than a number typed into the test) means a future edit to the encode's
  // timings moves this test's expectation along with the component's behaviour.
  it('derives the card boundaries from CLIP_STARTS', () => {
    render(<Film />)
    const el = video()
    fireTimeUpdate(el, CLIP_STARTS[2] - 0.01)
    expect(screen.getByText(FILM_CARDS[1].counter)).toBeInTheDocument()
    fireTimeUpdate(el, CLIP_STARTS[2])
    expect(screen.getByText(FILM_CARDS[2].counter)).toBeInTheDocument()
  })

  it('does not autoplay under reduced motion', () => {
    setPrefersReducedMotion(true)
    const { unmount } = render(<Film />)
    expect(video().getAttribute('autoplay')).toBeNull()
    unmount()

    setPrefersReducedMotion(false)
    render(<Film />)
    expect(video().getAttribute('autoplay')).not.toBeNull()
  })

  it('is at full size when the animation cannot run', () => {
    setPrefersReducedMotion(true)
    const { container } = render(<Film />)
    const frame = container.querySelector('[data-testid="film-frame"]')
    expect(frame).not.toBeNull()
    expect(frame!.className).not.toMatch(/scale-\[0\.85\]/)
  })

  it('falls back to the navy stand-in when the film file is missing', () => {
    render(<Film />)
    fireEvent.error(video())
    expect(document.querySelector('video')).not.toBeInTheDocument()
    expect(screen.getByTestId('film-fallback')).toBeInTheDocument()
    // The card overlay is not the video's problem to solve — it keeps counting.
    expect(screen.getByText(FILM_CARDS[0].counter)).toBeInTheDocument()
  })

  // The test above fires `error` after mount, which is the one case a server-rendered
  // <video> never hits: the file 404s during the initial load, well before React
  // hydrates and attaches the handler, and that event is not replayed. Verified in a
  // real browser on the assembled page — the element reported `error.code` 4 and
  // `networkState` 3 while the stand-in never appeared. jsdom loads nothing, so this
  // has to be simulated by putting the element into that already-failed state.
  it('falls back to the navy stand-in when the film already failed before hydration', () => {
    const spy = vi
      .spyOn(HTMLMediaElement.prototype, 'networkState', 'get')
      .mockReturnValue(3 /* NETWORK_NO_SOURCE */)
    try {
      render(<Film />)
      expect(document.querySelector('video')).not.toBeInTheDocument()
      expect(screen.getByTestId('film-fallback')).toBeInTheDocument()
    } finally {
      spy.mockRestore()
    }
  })

  it('the video has an accessible name', () => {
    render(<Film />)
    expect(video().getAttribute('aria-label')).toBeTruthy()
  })

  // The client approved this copy. It is the Fit and Specification argument in two
  // lines, and it is the one part of this section that must not drift on a rewrite.
  it('carries the approved split headline', () => {
    render(<Film />)
    expect(screen.getByText('Measured on site.')).toBeInTheDocument()
    expect(screen.getByText('Installed to the millimetre.')).toBeInTheDocument()
  })

  it('carries one heading, not two', () => {
    render(<Film />)
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  // F2: a bare <section> with no accessible name is not exposed as a landmark
  // region, even when it contains a heading — the section itself needs
  // aria-labelledby pointing at that heading (brief §5).
  it('gives the section its accessible name from the heading', () => {
    render(<Film />)
    expect(screen.getByRole('region', { name: 'Measured on site.' })).toBeInTheDocument()
  })

  // WCAG 2.2.2: anything that plays automatically for more than five seconds needs a
  // way to stop it, and this film loops forever. The control is present on every
  // breakpoint, because it is also what starts the film where autoplay is withheld.
  it('offers a control that pauses and resumes the film', async () => {
    const user = userEvent.setup()
    render(<Film />)

    // The control reads from the element, not from the autoplay attribute, so it starts
    // on "Play film" here: asking for autoplay is not the same as playback having begun.
    await user.click(screen.getByRole('button', { name: 'Play film' }))
    expect(video().paused).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Pause film' }))
    expect(video().paused).toBe(true)
  })

  it('does not autoplay on a phone, where the data is the visitor to spend', () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    try {
      render(<Film />)
      expect(video().getAttribute('autoplay')).toBeNull()
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: original, configurable: true })
    }
  })
})
