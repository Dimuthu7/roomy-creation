'use client'
import { useEffect, useRef } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null)
  const level = useMotionLevel()

  useEffect(() => {
    if (level !== 'full') return
    const el = ref.current
    if (!el) return

    const move = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
      const target = e.target as HTMLElement
      const label = target.closest('[data-cursor-label]')?.getAttribute('data-cursor-label')
      const interactive = target.closest('a, button, [role="button"], input, select, textarea')
      el.dataset.state = label ? 'label' : interactive ? 'grown' : 'default'
      el.textContent = label ?? ''
    }

    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [level])

  if (level !== 'full') return null

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
