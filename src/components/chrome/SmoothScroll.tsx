'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMotionLevel } from '@/hooks/useMotionLevel'

gsap.registerPlugin(ScrollTrigger)

export function SmoothScroll() {
  const level = useMotionLevel()

  useEffect(() => {
    if (level === 'reduced') return
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })

    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [level])

  return null
}
