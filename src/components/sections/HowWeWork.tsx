'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { ChevronLeftIcon, ChevronRightIcon, HOW_WE_WORK_ICONS } from './HowWeWorkIcons'

interface Step {
  number: string
  title: string
  description: string
  icon: keyof typeof HOW_WE_WORK_ICONS
}

// In the book (BookSteps), whichever page is open gets the heavy yellow treatment —
// larger display type, filled yellow block. In the static fallback grid
// (CompactSteps), there's no "open" page, so step index 1, Site measurement, keeps
// that treatment permanently: it's what separates fitted furniture from furniture
// bought off a shelf.
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
      className="on-paper relative bg-paper py-24 text-navy"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          How we work
        </h2>
        {level === 'full' ? <BookSteps /> : <CompactSteps />}
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
    <ol className="mt-8 grid gap-6 md:grid-cols-5">
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

// A single "page" width/height for the book. All five pages are stacked absolutely
// inside a box of this size so turning pages never reflows the box itself.
const CARD_WIDTH = 420

// Book of process steps: every step stays mounted (so its title/description is
// always in the DOM — the same "content survives even when not the active card"
// contract CompactSteps already gives crawlers and text-only agents), but only the
// open page is exposed to sighted and assistive-tech users at once. Turning a page
// rotates it off to the side it came from, like a real page-turn, rather than
// sliding a whole row — no scroll-jacking, no external scroll listener: the visitor
// drives it entirely by clicking, tapping the dots, or dragging the open page.
function BookSteps() {
  const [index, setIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)

  function goTo(next: number) {
    setHasInteracted(true)
    setIndex(Math.max(0, Math.min(STEPS.length - 1, next)))
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') goTo(index + 1)
    if (event.key === 'ArrowLeft') goTo(index - 1)
  }

  return (
    <div className="mt-8">
      <div
        data-testid="how-book"
        data-active-index={index}
        role="group"
        aria-roledescription="carousel"
        aria-label="How we work, step by step"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative mx-auto focus:outline-none"
        style={{ maxWidth: CARD_WIDTH }}
      >
        <ol className="relative h-[22rem] w-full" style={{ perspective: '1600px' }}>
          {STEPS.map((step, i) => {
            const isActive = i === index
            // Every page gets the heavy yellow treatment while it's the one open —
            // it's what makes the current page read as "in focus", not a trait of
            // any single step.
            const heaviest = isActive
            const comesAfter = i > index
            return (
              <motion.li
                key={step.number}
                data-testid={`how-step-${i}`}
                aria-hidden={!isActive}
                className={
                  (heaviest ? 'bg-yellow' : 'border border-navy/20 bg-paper') +
                  ' absolute inset-0 flex flex-col p-8'
                }
                style={{
                  transformOrigin: comesAfter ? 'left center' : 'right center',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
                animate={{
                  rotateY: isActive ? 0 : comesAfter ? 78 : -78,
                  opacity: isActive ? 1 : 0,
                }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                drag={isActive ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragStart={() => setHasInteracted(true)}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) goTo(index + 1)
                  else if (info.offset.x > 60) goTo(index - 1)
                }}
              >
                <div className={i === 0 ? 'how-nudge' : undefined}>
                  <StepBody step={step} heaviest={heaviest} />
                </div>
              </motion.li>
            )
          })}
        </ol>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous step"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-navy text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <div className="flex gap-2">
          {STEPS.map((step, i) => (
            <button
              key={step.number}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to step ${i + 1} of ${STEPS.length}: ${step.title}`}
              aria-current={index === i ? 'true' : undefined}
              data-testid={`how-dot-${i}`}
              className={
                index === i
                  ? 'h-1.5 w-6 rounded-full bg-yellow'
                  : 'h-1.5 w-6 rounded-full bg-navy/20 transition-colors hover:bg-navy/40'
              }
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === STEPS.length - 1}
          aria-label="Next step"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-navy text-navy transition-colors hover:bg-navy hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <p
        aria-hidden="true"
        className={
          'u-mono mt-4 text-center text-navy transition-opacity duration-500' +
          (hasInteracted ? ' opacity-0' : ' opacity-100')
        }
      >
        swipe, drag, or click to continue &rarr;
      </p>
    </div>
  )
}
