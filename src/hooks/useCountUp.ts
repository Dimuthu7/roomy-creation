'use client'
import { useEffect, useRef, useState } from 'react'
import { useMotionLevel } from './useMotionLevel'

export function useCountUp(target: number, active: boolean, duration = 900): number {
  const level = useMotionLevel()
  const [value, setValue] = useState(0)
  const settled = useRef(false)

  useEffect(() => {
    if (!active || settled.current) return
    if (level === 'reduced') {
      settled.current = true
      setValue(target)
      return
    }

    let frame = 0
    let start: number | null = null
    const step = (now: number) => {
      // `start` comes from the same clock as `now`, so elapsed time cannot go negative.
      if (start === null) start = now
      const progress = Math.min(Math.max((now - start) / duration, 0), 1)
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) {
        frame = requestAnimationFrame(step)
      } else {
        settled.current = true
      }
    }
    frame = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frame)
      // A half-finished figure on screen is a wrong figure. If we are torn down
      // mid-count, land on the real number rather than freezing part-way.
      if (!settled.current) {
        settled.current = true
        setValue(target)
      }
    }
  }, [target, active, duration, level])

  return value
}
