import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('WeaveReveal with motion allowed', () => {
  it('does animate on desktop, which is what makes the reduced-motion test meaningful', () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(
      <WeaveReveal from="left">
        <p>Fitted to the millimetre</p>
      </WeaveReveal>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttribute('style')).toBeTruthy()
  })
})
