import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { SmoothScroll } from './SmoothScroll'

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
})
