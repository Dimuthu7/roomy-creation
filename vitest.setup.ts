import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { installBrowserStubs, setPrefersReducedMotion } from './src/test/browserStubs'

installBrowserStubs()

beforeEach(() => {
  setPrefersReducedMotion(false)
  window.innerWidth = 1024
})
