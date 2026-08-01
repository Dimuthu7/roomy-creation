/**
 * jsdom implements neither matchMedia nor IntersectionObserver, and both throw
 * rather than degrading: useMotionLevel dies on the first, framer-motion's
 * whileInView dies on the second. Installed once from vitest.setup.ts.
 */

let prefersReducedMotion = false

/** Set before rendering. useMotionLevel reads matchMedia inside an effect on mount. */
export function setPrefersReducedMotion(value: boolean): void {
  prefersReducedMotion = value
}

function createMediaQueryList(query: string): MediaQueryList {
  return {
    matches: query.includes('prefers-reduced-motion') ? prefersReducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList
}

/** Reports every observed element as immediately in view, so whileInView resolves. */
class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  #callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.#callback = callback
  }

  observe(target: Element): void {
    this.#callback(
      [{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry],
      this,
    )
  }

  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

export function installBrowserStubs(): void {
  window.matchMedia = createMediaQueryList as typeof window.matchMedia
  window.IntersectionObserver =
    ImmediateIntersectionObserver as unknown as typeof window.IntersectionObserver
  globalThis.IntersectionObserver =
    ImmediateIntersectionObserver as unknown as typeof globalThis.IntersectionObserver
}
