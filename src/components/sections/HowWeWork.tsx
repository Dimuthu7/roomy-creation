'use client'
import { motion, useMotionValue } from 'framer-motion'
import { useEffect } from 'react'
import { driftX } from '@/lib/drift'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { HOW_WE_WORK_ICONS } from './HowWeWorkIcons'

interface Step {
  number: string
  title: string
  description: string
  icon: keyof typeof HOW_WE_WORK_ICONS
}

// Step index 1, Site measurement, is deliberately the heaviest of the five: larger
// display type and a filled yellow block, because it is what separates fitted
// furniture from furniture bought off a shelf.
//
// Description copy below is the implementer's draft, not client-approved — flagged
// for sign-off the same way Position's statement lines are (see
// docs/superpowers/specs/2026-08-11-how-we-work-journey-design.md).
const STEPS: Step[] = [
  {
    number: '01',
    title: 'Enquiry',
    description: 'Tell us what you need and we start the conversation.',
    icon: 'enquiry',
  },
  {
    number: '02',
    title: 'Site measurement',
    description: 'We visit your site and take precise measurements before anything is drawn.',
    icon: 'measurement',
  },
  {
    number: '03',
    title: 'Drawings, materials and quotation',
    description: 'Measurements become drawings, material choices and a firm quote.',
    icon: 'drawings',
  },
  {
    number: '04',
    title: 'Manufacture',
    description: 'Your piece is built to spec in our workshop.',
    icon: 'manufacture',
  },
  {
    number: '05',
    title: 'Installation and handover',
    description: 'We fit it on site and hand it over, ready to use.',
    icon: 'installation',
  },
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
        <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          How we work
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-5">
          {STEPS.map((step, i) => {
            const heaviest = i === 1
            const Icon = HOW_WE_WORK_ICONS[step.icon]
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
                  <Icon className={heaviest ? 'h-7 w-7 text-navy' : 'h-6 w-6 text-navy'} />
                  <span className="u-mono mt-3 block text-navy">{step.number}</span>
                  <p
                    className={
                      heaviest
                        ? 'mt-2 font-display text-3xl tracking-tight text-navy'
                        : 'mt-2 font-display text-xl tracking-tight text-navy'
                    }
                  >
                    {step.title}
                  </p>
                  <p className="mt-3 font-body text-sm leading-relaxed text-navy">{step.description}</p>
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
