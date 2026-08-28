'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMotionLevel } from '@/hooks/useMotionLevel'

gsap.registerPlugin(ScrollTrigger)

let activeLenis: Lenis | null = null

// Lets other chrome (ScrollToTop) drive the same smoothed scroll engine instead of
// fighting it with a second, independent scroll mechanism.
export function getLenis(): Lenis | null {
  return activeLenis
}

export function SmoothScroll() {
  const level = useMotionLevel()

  useEffect(() => {
    if (level === 'reduced') return
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
    activeLenis = lenis

    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // A pinned ScrollTrigger (Film) caches its start/end scroll offsets once, when it's
    // created, and never recalculates them on its own. Content elsewhere on the page —
    // the Work gallery filter swapping how many cards render, for instance — changes the
    // document's total height without firing a window `resize` event, so those cached
    // offsets go stale and the pin fires at the wrong scroll position. Lenis already
    // tracks this itself via a ResizeObserver on documentElement (autoResize: true,
    // above); mirror that here, debounced the same 250ms it uses, so GSAP's cache gets
    // invalidated whenever content height actually changes.
    let resizeTimeout: ReturnType<typeof setTimeout>
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => ScrollTrigger.refresh(), 250)
    })
    resizeObserver.observe(document.documentElement)

    return () => {
      clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
      gsap.ticker.remove(tick)
      lenis.destroy()
      activeLenis = null
    }
  }, [level])

  return null
}
