/**
 * jsdom implements neither matchMedia nor IntersectionObserver, and both throw
 * rather than degrading: useMotionLevel dies on the first, framer-motion's
 * whileInView dies on the second. Installed once from vitest.setup.ts.
 */

type Listener = () => void
const listeners = new Set<Listener>()
let prefersReducedMotion = false

/**
 * jsdom implements no pointer capture at all: setPointerCapture, hasPointerCapture and
 * releasePointerCapture are all undefined. BeforeAfterSlider calls setPointerCapture on
 * every pointerdown, so any test that fires one throws `TypeError:
 * e.currentTarget.setPointerCapture is not a function` without this stub.
 */
const capturedPointers = new Map<Element, Set<number>>()

/**
 * jsdom does not implement scrollIntoView at all — calling it throws
 * `TypeError: ...scrollIntoView is not a function` rather than doing nothing, so any
 * component that scrolls an element into view crashes every test that renders it. The
 * stub records what was asked for, so a test can assert the scroll behaviour (e.g.
 * `{ behavior: 'auto' }` under reduced motion) instead of merely surviving the call.
 */
interface ScrollIntoViewCall {
  target: Element
  arg: boolean | ScrollIntoViewOptions | undefined
}
let scrollIntoViewCalls: ScrollIntoViewCall[] = []

export function getScrollIntoViewCalls(): ScrollIntoViewCall[] {
  return scrollIntoViewCalls
}

/** Set before rendering. */
export function setPrefersReducedMotion(value: boolean): void {
  prefersReducedMotion = value
}

/** Simulates the user toggling the OS setting mid-session; notifies live subscribers. */
export function emitMotionPreferenceChange(value: boolean): void {
  prefersReducedMotion = value
  for (const listener of listeners) listener()
}

/** Called from beforeEach so a leaked subscriber cannot leak across tests. */
export function resetBrowserStubs(): void {
  listeners.clear()
  prefersReducedMotion = false
  capturedPointers.clear()
  scrollIntoViewCalls = []
}

function createMediaQueryList(query: string): MediaQueryList {
  return {
    matches: query.includes('prefers-reduced-motion') ? prefersReducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: Listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: Listener) => {
      listeners.delete(listener)
    },
    addListener: (listener: Listener) => {
      listeners.add(listener)
    },
    removeListener: (listener: Listener) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => false,
  } as unknown as MediaQueryList
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

  // Unlike a real browser, this stub does not listen for `pointerup` or `pointercancel`
  // at all, so it never auto-releases capture the way a browser does when the pointer
  // lifts. A captured pointer stays captured until something calls
  // `releasePointerCapture` explicitly, or until `resetBrowserStubs()` clears it between
  // tests. Any future test that fires `pointerup` and expects `hasPointerCapture` to have
  // gone false as a result will falsely pass or fail on that assumption alone — it must
  // call `releasePointerCapture` itself (as production code should on pointerup) for the
  // assertion to mean anything.
  Element.prototype.setPointerCapture = function (pointerId: number): void {
    let set = capturedPointers.get(this)
    if (!set) {
      set = new Set()
      capturedPointers.set(this, set)
    }
    set.add(pointerId)
  }
  Element.prototype.hasPointerCapture = function (pointerId: number): boolean {
    return capturedPointers.get(this)?.has(pointerId) ?? false
  }
  Element.prototype.releasePointerCapture = function (pointerId: number): void {
    capturedPointers.get(this)?.delete(pointerId)
  }
  Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions): void {
    scrollIntoViewCalls.push({ target: this, arg })
  }
}
