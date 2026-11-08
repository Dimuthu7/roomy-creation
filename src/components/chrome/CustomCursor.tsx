'use client'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'

// A follower ring only makes sense for a real mouse or trackpad. 'full' motion is
// decided by width alone, so a touch tablet in landscape (an iPad is wider than the
// mobile breakpoint) got the ring too — parked wherever the last tap landed. Gating on
// the primary pointer as well keeps it off every touch-first device.
const FINE_POINTER = '(hover: hover) and (pointer: fine)'

function subscribePointer(onChange: () => void): () => void {
  const query = window.matchMedia(FINE_POINTER)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useFinePointer(): boolean {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false,
  )
}

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null)
  const level = useMotionLevel()
  const finePointer = useFinePointer()
  const enabled = level === 'full' && finePointer

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    const move = (e: PointerEvent) => {
      // A touch-screen laptop still reports a fine primary pointer; a finger on its
      // screen should not drag the ring around.
      if (e.pointerType === 'touch') return
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
      const target = e.target as HTMLElement
      const label = target.closest('[data-cursor-label]')?.getAttribute('data-cursor-label')
      const interactive = target.closest('a, button, [role="button"], input, select, textarea')
      el.dataset.state = label ? 'label' : interactive ? 'grown' : 'default'
      el.textContent = label ?? ''
    }

    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-state="default"
      className="pointer-events-none fixed left-0 top-0 z-[100] flex items-center justify-center
                 rounded-full border border-teal text-navy u-mono
                 transition-[width,height,background-color] duration-200
                 data-[state=default]:h-6 data-[state=default]:w-6
                 data-[state=grown]:h-10 data-[state=grown]:w-10
                 data-[state=label]:h-auto data-[state=label]:w-auto
                 data-[state=label]:bg-yellow data-[state=label]:px-3 data-[state=label]:py-1"
    />
  )
}
