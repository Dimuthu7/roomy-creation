'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { getLenis } from './SmoothScroll'

const RADIUS = 24
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ScrollToTop() {
  const level = useMotionLevel()
  const reduced = level === 'reduced'
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight)
      const doc = document.documentElement
      const scrollable = Math.max(doc.scrollHeight - doc.clientHeight, 1)
      setProgress(Math.min(window.scrollY / scrollable, 1))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  const handleClick = () => {
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to top"
      data-cursor-label="Top"
      // z-40: below the Lightbox portal's z-50 — a float over a modal is a defect.
      className="fixed left-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center
                 rounded-full bg-yellow text-navy shadow-lg"
      initial={reduced ? undefined : { opacity: 0, scale: 0.6 }}
      animate={reduced ? undefined : { opacity: 1, scale: 1 }}
      whileHover={reduced ? undefined : { scale: 1.08 }}
      whileTap={reduced ? undefined : { scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <svg viewBox="0 0 56 56" width="56" height="56" className="absolute inset-0" aria-hidden="true">
        <circle cx="28" cy="28" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <ArrowUpIcon />
    </motion.button>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M12 19V5M5 12l7-7 7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
