'use client'
import { useEffect, useState } from 'react'
import { useMotionLevel } from './useMotionLevel'

export function useCountUp(target: number, active: boolean, duration = 900): number {
  const level = useMotionLevel()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    if (level === 'reduced') {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, active, duration, level])

  return value
}
