'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { getLenis } from './SmoothScroll'

const RADIUS = 24
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ringOffset(): number {
  const doc = document.documentElement
  const scrollable = Math.max(doc.scrollHeight - doc.clientHeight, 1)
  return CIRCUMFERENCE * (1 - Math.min(window.scrollY / scrollable, 1))
}

export function ScrollToTop() {
  const level = useMotionLevel()
  const reduced = level === 'reduced'
  const [visible, setVisible] = useState(false)
  const ringRef = useRef<SVGCircleElement>(null)

  // The progress ring used to live in React state, so every scroll event re-rendered
  // the button — dozens of times a second. Only the show/hide flag is state now (React
  // skips the render when it hasn't changed); the ring is written straight to the DOM.
  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight)
      ringRef.current?.setAttribute('stroke-dashoffset', String(ringOffset()))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // A fresh mount (each time the button reappears) paints the ring straight away rather
  // than waiting for the next scroll event.
  useEffect(() => {
    if (visible) ringRef.current?.setAttribute('stroke-dashoffset', String(ringOffset()))
  }, [visible])

  const handleClick = () => {
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    }
  }

  return (
    // Fades and shrinks away when the visitor scrolls back to the top, instead of
    // vanishing in a single frame. Under reduced motion there is no exit, so it is
    // removed immediately as before.
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-to-top"
          type="button"
          onClick={handleClick}
          aria-label="Scroll to top"
          data-cursor-label="Top"
          // z-40: below the Lightbox portal's z-50 — a float over a modal is a defect.
          className="fixed left-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center
                     rounded-full bg-yellow text-navy shadow-lg"
          initial={reduced ? undefined : { opacity: 0, scale: 0.6 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.6 }}
          whileHover={reduced ? undefined : { scale: 1.08 }}
          whileTap={reduced ? undefined : { scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <svg viewBox="0 0 56 56" width="56" height="56" className="absolute inset-0" aria-hidden="true">
            <circle cx="28" cy="28" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <circle
              ref={ringRef}
              cx="28"
              cy="28"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE}
              transform="rotate(-90 28 28)"
            />
          </svg>
          <ArrowUpIcon />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M12 19V5M5 12l7-7 7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
