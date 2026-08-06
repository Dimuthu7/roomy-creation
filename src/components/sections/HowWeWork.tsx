'use client'
import { motion, useMotionValue } from 'framer-motion'
import { useEffect } from 'react'
import { isTBC, TBC, type Maybe } from '@/lib/tbc'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { WeaveReveal } from '@/components/weave/WeaveReveal'

interface Step {
  number: string
  title: string
  /** No lead time is confirmed yet — every step renders an em dash until it is. */
  leadTime: Maybe<string>
}

// Step index 1, Site measurement, is deliberately the heaviest of the five: larger
// display type and a filled yellow block, because it is what separates fitted
// furniture from furniture bought off a shelf.
const STEPS: Step[] = [
  { number: '01', title: 'Enquiry', leadTime: TBC },
  { number: '02', title: 'Site measurement', leadTime: TBC },
  { number: '03', title: 'Drawings, materials and quotation', leadTime: TBC },
  { number: '04', title: 'Manufacture', leadTime: TBC },
  { number: '05', title: 'Installation and handover', leadTime: TBC },
]

export function HowWeWork() {
  return (
    <section id="how" className="on-paper relative overflow-hidden bg-paper py-24 text-navy">
      <DriftingModule />
      <div className="relative mx-auto max-w-6xl px-6">
        <ol className="grid gap-6 md:grid-cols-5">
          {STEPS.map((step, i) => {
            const heaviest = i === 1
            return (
              <WeaveReveal key={step.number} from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.05}>
                <li
                  data-testid={`how-step-${i}`}
                  className={heaviest ? 'bg-yellow p-6 text-navy' : 'border border-navy/20 p-6 text-navy'}
                >
                  <span className="u-mono text-navy/60">{step.number}</span>
                  <p
                    className={
                      heaviest
                        ? 'mt-3 font-display text-3xl tracking-tight text-navy'
                        : 'mt-3 font-display text-xl tracking-tight text-navy'
                    }
                  >
                    {step.title}
                  </p>
                  <p className="u-mono mt-4 text-navy/60">{isTBC(step.leadTime) ? '—' : step.leadTime}</p>
                </li>
              </WeaveReveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/**
 * A decorative wardrobe-module silhouette that drifts sideways as the visitor
 * scrolls. Driven from a plain `scroll` listener rather than framer-motion's
 * `useScroll`, which measures target elements via ResizeObserver — an API this
 * project's jsdom test environment does not stub. The client's rule is absolute:
 * prefers-reduced-motion disables all transforms, so nothing here is even wired up
 * below 'full'.
 */
function DriftingModule() {
  const level = useMotionLevel()
  const x = useMotionValue(0)

  useEffect(() => {
    if (level !== 'full') return
    function onScroll() {
      x.set((window.scrollY % 200) - 100)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [level, x])

  return (
    <div
      data-testid="how-cutout"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/4 right-0 h-40 w-24 overflow-hidden"
    >
      <motion.div
        data-testid="how-cutout-inner"
        style={level === 'full' ? { x } : undefined}
        className="h-full w-full bg-navy/10"
      />
    </div>
  )
}
