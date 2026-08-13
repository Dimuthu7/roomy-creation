import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { SmoothScroll } from './SmoothScroll'

gsap.registerPlugin(ScrollTrigger)

/**
 * Captures the callback a component passes to `new ResizeObserver(cb)` so a test can
 * invoke it directly — the global stub installed for every other test is a deliberate
 * no-op (jsdom performs no layout, so it cannot fabricate a real size change), which
 * makes it useless for proving a component actually reacts to a resize signal.
 */
class CapturingResizeObserver {
  static lastCallback: ResizeObserverCallback | null = null
  #callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
    CapturingResizeObserver.lastCallback = callback
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('SmoothScroll', () => {
  it('renders nothing', () => {
    const { container } = render(<SmoothScroll />)
    expect(container).toBeEmptyDOMElement()
  })

  // F1: Lenis's Dimensions class constructs a ResizeObserver on mount, an API jsdom
  // does not implement. Under 'full' this used to throw before the ResizeObserver
  // stub existed — this pins that constructing the effect no longer does.
  it('constructs without throwing at full motion, where Lenis is built', () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    expect(() => render(<SmoothScroll />)).not.toThrow()
  })

  it('does not construct Lenis under reduced motion', () => {
    setPrefersReducedMotion(true)
    // If Lenis were constructed anyway, ResizeObserver would still be stubbed and
    // this alone would not catch it — the real signal is that the effect returns
    // before ever touching `window.scrollTo`-driving raf machinery, which we assert
    // indirectly here by confirming render neither throws nor errors when
    // ResizeObserver is deliberately removed from the environment.
    const original = window.ResizeObserver
    // @ts-expect-error -- simulating an environment where the constructor is absent
    delete window.ResizeObserver
    try {
      expect(() => render(<SmoothScroll />)).not.toThrow()
    } finally {
      window.ResizeObserver = original
    }
  })

  it('cleans up on unmount without throwing', () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { unmount } = render(<SmoothScroll />)
    expect(() => unmount()).not.toThrow()
  })

  // Regression: a pinned ScrollTrigger (Film) caches its start/end scroll offsets once
  // at mount and never recalculates them on its own. Lenis auto-adapts to a document
  // height change (e.g. the Work gallery filter swapping how many cards render) via its
  // own ResizeObserver, but nothing told GSAP to do the same — so its cached pin
  // offsets went stale relative to the new, shorter document and the pin fired at the
  // wrong scroll position.
  it('refreshes ScrollTrigger when the document content resizes', () => {
    vi.useFakeTimers()
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const original = window.ResizeObserver
    window.ResizeObserver = CapturingResizeObserver as unknown as typeof window.ResizeObserver
    globalThis.ResizeObserver = CapturingResizeObserver as unknown as typeof globalThis.ResizeObserver
    const refreshSpy = vi.spyOn(ScrollTrigger, 'refresh').mockImplementation(() => {})

    try {
      render(<SmoothScroll />)
      expect(CapturingResizeObserver.lastCallback).not.toBeNull()

      refreshSpy.mockClear()
      CapturingResizeObserver.lastCallback!([], {} as ResizeObserver)
      vi.runAllTimers()

      expect(refreshSpy).toHaveBeenCalled()
    } finally {
      refreshSpy.mockRestore()
      window.ResizeObserver = original
      globalThis.ResizeObserver = original
      vi.useRealTimers()
    }
  })
})
