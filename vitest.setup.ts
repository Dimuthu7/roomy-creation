import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { mockAnimationsApi } from 'jsdom-testing-mocks'
import { beforeEach } from 'vitest'
import { installBrowserStubs, setPrefersReducedMotion, resetBrowserStubs } from './src/test/browserStubs'

installBrowserStubs()

// jsdom has no Web Animations API at all. Headless UI's `transition` prop (used by
// QuoteForm's Listboxes) detects when a panel's open/close CSS transition has finished
// by calling `Element.prototype.getAnimations`, and auto-polyfills a crude stand-in
// when it is missing — the exact case here — which settles inconsistently under a
// heavily parallel `vitest run` and was making QuoteForm.test.tsx flake in ways a real
// browser never does. `mockAnimationsApi` is Headless UI's own documented fix for
// this: a real, deterministic implementation instead of their fallback guess.
mockAnimationsApi()

// The default 1000ms is tight for anything that opens a portaled, floating-positioned
// panel (QuoteForm's Headless UI Listboxes): jsdom does no real layout/paint, so
// floating-ui's position computation and the open/close transition both run as extra
// microtask/rAF ticks rather than the near-instant browser case. Under a full,
// parallel `vitest run` those ticks compete with 40+ other test files for the CPU, so
// a `findBy`/`waitFor` that clears in well under 1000ms in isolation can occasionally
// miss that window under load — not because the interaction is broken (it is not:
// verified manually in a real browser), but because the default budget assumes
// near-instant DOM settling that jsdom + contention doesn't guarantee.
configure({ asyncUtilTimeout: 3000 })

beforeEach(() => {
  resetBrowserStubs()
  setPrefersReducedMotion(false)
  window.innerWidth = 1024
})
