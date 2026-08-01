import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { setPrefersReducedMotion } from '@/test/browserStubs'
import { useCountUp } from './useCountUp'

function Figure({ target, active }: { target: number; active: boolean }) {
  return <span data-testid="figure">{useCountUp(target, active)}</span>
}

function read(container: HTMLElement): number {
  return Number((container.querySelector('[data-testid=figure]') as HTMLElement).textContent)
}

describe('useCountUp', () => {
  it('counts up from zero and lands exactly on the target', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<Figure target={100} active />)
    expect(read(container)).toBe(0)
    await waitFor(() => expect(read(container)).toBe(100), { timeout: 3000 })
  })

  it('never renders a negative figure or overshoots the target', async () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<Figure target={100} active />)
    const samples: number[] = []
    for (let i = 0; i < 12; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      samples.push(read(container))
    }
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...samples)).toBeLessThanOrEqual(100)
    expect(samples.at(-1)).toBe(100)
  })

  it('shows the real figure immediately under reduced motion, never a partial one', () => {
    setPrefersReducedMotion(true)
    const { container } = render(<Figure target={100} active />)
    expect(read(container)).toBe(100)
  })

  it('stays at zero until it is active', () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<Figure target={100} active={false} />)
    expect(read(container)).toBe(0)
  })
})
