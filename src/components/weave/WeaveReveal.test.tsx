import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { WeaveReveal } from './WeaveReveal'

describe('WeaveReveal under reduced motion', () => {
  it('applies no transform at all', () => {
    setPrefersReducedMotion(true)
    const { container } = render(
      <WeaveReveal from="left">
        <p>Fitted to the millimetre</p>
      </WeaveReveal>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.transform).toBe('')
  })

  it('still renders its content, so nothing is hidden by the accessible path', () => {
    setPrefersReducedMotion(true)
    render(
      <WeaveReveal from="right">
        <p>Fitted to the millimetre</p>
      </WeaveReveal>,
    )
    expect(screen.getByText('Fitted to the millimetre')).toBeInTheDocument()
  })
})

function renderAtFullMotion(from: 'left' | 'right') {
  setPrefersReducedMotion(false)
  window.innerWidth = 1440
  const { container } = render(
    <WeaveReveal from={from}>
      <p>Fitted to the millimetre</p>
    </WeaveReveal>,
  )
  return container.firstElementChild as HTMLElement
}

describe('WeaveReveal with motion allowed', () => {
  it('starts hidden and offset from the left', () => {
    const wrapper = renderAtFullMotion('left')
    expect(wrapper.style.opacity).toBe('0')
    expect(wrapper.style.transform).toBe('translateX(-48px)')
  })

  it('starts offset from the right when asked to', () => {
    const wrapper = renderAtFullMotion('right')
    expect(wrapper.style.transform).toBe('translateX(48px)')
  })

  // The load-bearing one. Asserting merely that *some* inline style exists passes
  // even against a component that never reveals, because framer-motion writes the
  // hidden `initial` values synchronously on mount. Only waiting for opacity to
  // reach 1 proves the content actually arrives for a full-motion visitor — and it
  // is what stops the reduced-motion tests above from being vacuous.
  it('settles fully visible, so the content is never left hidden', async () => {
    const wrapper = renderAtFullMotion('left')
    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: 2000 })
  })
})
