'use client'
import { motion, useMotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { driftX } from '@/lib/drift'
import { activeScrollStep } from '@/lib/scrollProgress'
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
// furniture from furniture bought off a shelf. In the pinned full-motion variant
// that treatment only applies once the step is active; the compact fallback below
// applies it permanently, since nothing else there conveys emphasis.
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
  const level = useMotionLevel()
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="on-paper relative overflow-x-clip bg-paper py-24 text-navy"
    >
      <DriftingModule />
      <div className="relative mx-auto max-w-6xl px-6">
        <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          How we work
        </h2>
        {level === 'full' ? <PinnedSteps /> : <CompactSteps />}
      </div>
    </section>
  )
}

function StepBody({ step, heaviest }: { step: Step; heaviest: boolean }) {
  const Icon = HOW_WE_WORK_ICONS[step.icon]
  return (
    <>
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
    </>
  )
}

function CompactSteps() {
  return (
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
              <StepBody step={step} heaviest={heaviest} />
            </WeaveReveal>
          </li>
        )
      })}
    </ol>
  )
}

// The scroll distance (in viewport heights) spent pinned on each step before the
// next one takes over. Shorter than Position's 55vh per point — each step here is
// lighter content (icon + title + one sentence) than Position's fuller prose.
const STEP_VH = 45
// Card width and the gap between cards, in px. Kept as plain numbers (not Tailwind
// arbitrary values alone) because the horizontal scroll offset below must be
// computed from the same figures: CARD_SPACING is what one active-index step moves
// the track by.
const CARD_WIDTH = 320
const CARD_GAP = 24
const CARD_SPACING = CARD_WIDTH + CARD_GAP

// Pinned scroll-reveal only runs at full motion — position: sticky plus a scroll
// listener is exactly the kind of transform-heavy effect the client's reduced-motion
// rule disables outright, and pinned/scroll-jacked sections are also the pattern most
// prone to going janky on small touch viewports. Reduced motion and mobile both get
// CompactSteps instead: every step laid out normally, still scroll-revealed via
// WeaveReveal, just not scroll-jacked.
function PinnedSteps() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    function onScroll() {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      setActive(activeScrollStep(rect.top, rect.height, window.innerHeight, STEPS.length))
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      ref={trackRef}
      data-testid="how-track"
      data-active-index={active}
      className="relative mt-10"
      style={{ height: `${STEP_VH * STEPS.length}vh` }}
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden">
        <motion.ol
          data-testid="how-track-list"
          className="flex"
          style={{ gap: `${CARD_GAP}px` }}
          animate={{ x: CARD_SPACING * ((STEPS.length - 1) / 2 - active) }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {STEPS.map((step, i) => {
            const isActive = active === i
            const heaviest = i === 1 && isActive
            return (
              <motion.li
                key={step.number}
                data-testid={`how-step-${i}`}
                className={heaviest ? 'bg-yellow p-6 shrink-0' : 'border border-navy/20 p-6 shrink-0'}
                style={{ width: `${CARD_WIDTH}px` }}
                // 0.4 was rejected: navy text over paper at 40% opacity composites to
                // ~2.3:1, below the 4.5:1 AA floor. 0.7 composites to ~5.2:1 (passes)
                // while still reading as de-emphasized alongside the scale-down.
                animate={{ opacity: isActive ? 1 : 0.7, scale: isActive ? 1 : 0.92 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <StepBody step={step} heaviest={heaviest} />
              </motion.li>
            )
          })}
        </motion.ol>
        <div className="mt-6 flex gap-2" aria-hidden="true">
          {STEPS.map((step, i) => (
            <span
              key={step.number}
              data-testid={`how-dot-${i}`}
              className={
                active === i ? 'h-1.5 w-6 rounded-full bg-yellow' : 'h-1.5 w-6 rounded-full bg-navy/20'
              }
            />
          ))}
        </div>
      </div>
    </div>
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
