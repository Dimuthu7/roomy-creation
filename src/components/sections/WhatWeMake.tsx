'use client'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import type { PointerEvent } from 'react'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { useGalleryFilter } from '@/context/GalleryFilter'
import type { WorkCategoryId } from '@/data/categories'
import { MakeIcon, WHAT_WE_MAKE_ICONS } from './WhatWeMakeIcons'

const CARDS: ReadonlyArray<{ label: string; category: WorkCategoryId }> = [
  { label: 'Sofas & seating', category: 'seating' },
  { label: 'Kitchens & pantry cupboards', category: 'kitchen' },
  { label: 'Wardrobes & storage', category: 'wardrobe' },
  { label: 'TV & living units', category: 'living' },
  { label: 'Office & commercial', category: 'office' },
]

// Five cards in a three-column grid left two stranded on the last row. On a six-column
// track the first two span three columns each and the last three span two, so desktop
// reads as a deliberate 2-over-3; at two columns the first card spans the full width
// (1-2-2) for the same reason.
function spanClass(index: number): string {
  if (index === 0) return 'sm:col-span-2 lg:col-span-3'
  return index === 1 ? 'lg:col-span-3' : 'lg:col-span-2'
}

export function WhatWeMake() {
  return (
    // Paper, not navy: Hero through Film used to be one unbroken navy run, which read as
    // a single long block. This band breaks it up before the gallery.
    <section
      aria-labelledby="what-we-make-heading"
      className="on-paper bg-paper py-24 text-navy"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* F2: a structural label, not a marketing claim — flagged for sign-off,
            brief §8. Without it this section had no heading at all and was not
            reachable by heading or landmark navigation. */}
        <h2
          id="what-we-make-heading"
          className="font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl"
        >
          What we make
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
          {CARDS.map(({ label, category }, i) => (
            <WeaveReveal
              key={label}
              from={i % 2 === 0 ? 'left' : 'right'}
              delay={i * 0.06}
              className={spanClass(i)}
            >
              <Card index={i} label={label} category={category} />
            </WeaveReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// Springs rather than raw motion values: the tilt used to snap flat the instant the
// pointer left a card. Now it follows the pointer with a little weight and settles back.
const TILT_SPRING = { stiffness: 220, damping: 18, mass: 0.6 }

function Card({ index, label, category }: { index: number; label: string; category: WorkCategoryId }) {
  const level = useMotionLevel()
  const reduced = level === 'reduced'
  const gallery = useGalleryFilter()
  const rotateXTarget = useMotionValue(0)
  const rotateYTarget = useMotionValue(0)
  const rotateX = useSpring(rotateXTarget, TILT_SPRING)
  const rotateY = useSpring(rotateYTarget, TILT_SPRING)
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
    rotateYTarget.set(px * 16)
    rotateXTarget.set(-py * 16)
  }

  function handlePointerLeave() {
    rotateXTarget.set(0)
    rotateYTarget.set(0)
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
      // `whileTap` alone makes framer-motion inject tabIndex=0 on mount (it assumes
      // anything tappable should be keyboard-operable) — this card is a presentational
      // touch effect, not a control, so that has to be overridden explicitly.
      tabIndex={-1}
      style={level === 'full' ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      className="group relative h-full rounded-2xl border border-navy/10 bg-white p-8 shadow-sm transition-[border-color,background-color,box-shadow] duration-300 hover:border-teal/50 hover:shadow-md active:border-teal/60 active:bg-teal/15"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-teal/40 text-navy transition-colors duration-300 group-hover:text-teal group-active:border-teal/70 group-active:text-teal">
        <Icon className="h-5 w-5" />
      </span>
      {gallery ? (
        // The whole card is the hit area (the button's ::after stretches over it), but
        // the focusable control is this one real button — the card itself stays out of
        // the tab order, as before.
        <button
          type="button"
          onClick={() => gallery.showCategory(category)}
          className="mt-4 block text-left font-display text-xl tracking-tight text-navy after:absolute after:inset-0 after:rounded-2xl after:content-['']"
        >
          {label}
          <span className="u-mono mt-3 flex items-center gap-1 text-navy/70 transition-colors duration-300 group-hover:text-navy">
            See this work
            <span
              aria-hidden="true"
              className="transition-transform duration-300 motion-safe:group-hover:translate-x-1"
            >
              →
            </span>
          </span>
        </button>
      ) : (
        <p className="mt-4 font-display text-xl tracking-tight text-navy">{label}</p>
      )}
    </motion.div>
  )
}
