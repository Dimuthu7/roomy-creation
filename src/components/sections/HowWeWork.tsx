'use client'
import { motion, useMotionValue } from 'framer-motion'
import { useEffect } from 'react'
import { driftX } from '@/lib/drift'
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
    <section
      id="how"
      aria-labelledby="how-heading"
      className="on-paper relative overflow-hidden bg-paper py-24 text-navy"
    >
      <DriftingModule />
      <div className="relative mx-auto max-w-6xl px-6">
        {/* F2: a structural label, not a marketing claim — flagged for sign-off,
            brief §8. Without it the process argument was unreachable by heading
            navigation. */}
        <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          How we work
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-5">
          {STEPS.map((step, i) => {
            const heaviest = i === 1
            return (
              // The reveal sits INSIDE the <li>, not around it: WeaveReveal renders a
              // motion.div, and a <div> between <ol> and <li> is invalid and costs the
              // list its semantics — a screen reader stops announcing "list, 5 items".
              <li
                key={step.number}
                data-testid={`how-step-${i}`}
                className={heaviest ? 'bg-yellow' : 'border border-navy/20'}
              >
                <WeaveReveal from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.05} className="p-6">
                  {/* Full navy, never an alpha variant. `.u-mono` is 12px, and navy at
                      60% measures 3.48:1 on the yellow block and 3.87:1 on paper —
                      both under the 4.5:1 AA floor for text that size. */}
                  <span className="u-mono text-navy">{step.number}</span>
                  <p
                    className={
                      heaviest
                        ? 'mt-3 font-display text-3xl tracking-tight text-navy'
                        : 'mt-3 font-display text-xl tracking-tight text-navy'
                    }
                  >
                    {step.title}
                  </p>
                  <p className="u-mono mt-4 text-navy">
                    {isTBC(step.leadTime) ? '—' : step.leadTime}
                  </p>
                </WeaveReveal>
              </li>
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
      x.set(driftX(window.scrollY))
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
