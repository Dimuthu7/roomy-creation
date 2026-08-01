'use client'
import { useEffect, useState } from 'react'

export type MotionLevel = 'full' | 'reduced' | 'mobile'
export const MOBILE_MAX = 767

export function resolveMotionLevel(prefersReduced: boolean, width: number): MotionLevel {
  if (prefersReduced) return 'reduced'
  return width <= MOBILE_MAX ? 'mobile' : 'full'
}

export function useMotionLevel(): MotionLevel {
  // Server and first paint assume the most conservative setting.
  const [level, setLevel] = useState<MotionLevel>('reduced')

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setLevel(resolveMotionLevel(motionQuery.matches, window.innerWidth))
    update()
    motionQuery.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      motionQuery.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return level
}
