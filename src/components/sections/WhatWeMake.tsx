'use client'
import { motion, useMotionValue } from 'framer-motion'
import type { PointerEvent } from 'react'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { MakeIcon, WHAT_WE_MAKE_ICONS } from './WhatWeMakeIcons'

const CARDS = [
  'Sofas & seating',
  'Kitchens & pantry cupboards',
  'Wardrobes & storage',
  'TV & living units',
  'Office & commercial',
]

export function WhatWeMake() {
  return (
    <section aria-labelledby="what-we-make-heading" className="bg-navy py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* F2: a structural label, not a marketing claim — flagged for sign-off,
            brief §8. Without it this section had no heading at all and was not
            reachable by heading or landmark navigation. */}
        <h2
          id="what-we-make-heading"
          className="font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl"
        >
          What we make
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((label, i) => (
            <WeaveReveal key={label} from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.06}>
              <Card index={i} label={label} />
            </WeaveReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Card({ index, label }: { index: number; label: string }) {
  const level = useMotionLevel()
  const reduced = level === 'reduced'
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const Icon = WHAT_WE_MAKE_ICONS[label] ?? MakeIcon

  // The client's rule is absolute: prefers-reduced-motion disables all transforms. The
  // style object carrying rotateX/rotateY is only attached at all when motion is
  // allowed, so a reduced-motion visitor's card carries no transform, not merely a
  // resting one.
  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (level !== 'full') return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * 16)
    rotateX.set(-py * 16)
  }

  function handlePointerLeave() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      data-testid={`make-card-${index}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      // Empty handler, not decoration: iOS Safari only ever matches `:active` on an
      // element that looks clickable to it (a link/button, or one with its own
      // onclick), so without this the active: glow below would never fire on a touch
      // tap, only on desktop's :hover.
      onClick={() => {}}
      style={level === 'full' ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      className="group rounded-2xl border border-teal/30 bg-teal/5 p-8 transition-colors duration-300 hover:border-teal/50 active:border-teal/60 active:bg-teal/15"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-teal/40 text-sky transition-colors duration-300 group-hover:text-teal group-active:border-teal/70 group-active:text-teal">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-display text-xl tracking-tight text-paper">{label}</p>
    </motion.div>
  )
}
