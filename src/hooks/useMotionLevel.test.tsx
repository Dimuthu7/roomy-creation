import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { act } from 'react'
import {
  setPrefersReducedMotion,
  emitMotionPreferenceChange,
} from '@/test/browserStubs'
import { resolveMotionLevel, MOBILE_MAX, useMotionLevel } from './useMotionLevel'

describe('resolveMotionLevel', () => {
  it('returns reduced whenever the user asks for reduced motion, at any width', () => {
    expect(resolveMotionLevel(true, 1440)).toBe('reduced')
    expect(resolveMotionLevel(true, 375)).toBe('reduced')
  })

  it('returns mobile on small screens', () => {
    expect(resolveMotionLevel(false, 375)).toBe('mobile')
    expect(resolveMotionLevel(false, MOBILE_MAX)).toBe('mobile')
  })

  it('returns full on desktop', () => {
    expect(resolveMotionLevel(false, MOBILE_MAX + 1)).toBe('full')
    expect(resolveMotionLevel(false, 1440)).toBe('full')
  })

  it('treats reduced-motion as higher priority than viewport width', () => {
    expect(resolveMotionLevel(true, MOBILE_MAX + 1)).not.toBe('full')
  })
})

function Probe() {
  return <span data-testid="level">{useMotionLevel()}</span>
}

function readLevel(container: HTMLElement): string {
  return (container.querySelector('[data-testid=level]') as HTMLElement).textContent ?? ''
}

describe('useMotionLevel', () => {
  it('reports full on the very first render, with no flip from a conservative default', () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<Probe />)
    expect(readLevel(container)).toBe('full')
  })

  it('reports reduced on the very first render when the user asked for it', () => {
    setPrefersReducedMotion(true)
    const { container } = render(<Probe />)
    expect(readLevel(container)).toBe('reduced')
  })

  it('reports mobile on the very first render at a small width', () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 375
    const { container } = render(<Probe />)
    expect(readLevel(container)).toBe('mobile')
  })

  it('follows the user turning reduced motion on mid-session', () => {
    setPrefersReducedMotion(false)
    window.innerWidth = 1440
    const { container } = render(<Probe />)
    expect(readLevel(container)).toBe('full')
    act(() => emitMotionPreferenceChange(true))
    expect(readLevel(container)).toBe('reduced')
  })
})
