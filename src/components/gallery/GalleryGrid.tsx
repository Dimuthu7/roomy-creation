'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WORKS } from '@/data/works'
import type { CategoryId } from '@/data/categories'
import { filterWorks, isEager, visibleCategories } from '@/lib/galleryLayout'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { FilterRow } from './FilterRow'
import { GalleryCard } from './GalleryCard'

// Every cell renders at the same fixed aspect ratio regardless of the source
// photo's own ratio — GalleryCard crops to it with `object-cover`. A prior
// version varied each cell's height by the work's real aspect ratio and offset
// alternating columns sideways to fake a "brick" interlock; the client found the
// result — staggered column tops, cards of visibly different sizes — read as
// disorganised rather than deliberate, and asked for a plain aligned grid instead.
const CARD_ASPECT = 'aspect-[4/3]'

export function GalleryGrid({ onOpen }: { onOpen: (index: number) => void }) {
  const [active, setActive] = useState<CategoryId>('all')
  const [hovered, setHovered] = useState(false)
  const level = useMotionLevel()

  const visible = filterWorks(WORKS, active)
  const categories = visibleCategories(WORKS)
  const stagger = level === 'reduced' ? 0 : 0.025

  return (
    <div>
      {/* Sticky within this outer div's bounds: pinned flush under the fixed nav
          while the grid below scrolls past, then released the moment this div's own
          bottom — the end of the grid — reaches that point. `top-[65px]` is the
          nav's own measured height (globals.css's `scroll-padding-top` comment: py-4
          + the h-8 logo + the 1px hairline) — flush, not the 5rem anchor-scroll
          clearance that leaves a gap here. bg-navy stops the grid's images showing
          through while pinned. */}
      <div className="sticky top-[65px] z-40 bg-navy py-3">
        <FilterRow categories={categories} active={active} onChange={setActive} />
      </div>

      <motion.div
        layout={level === 'full'}
        data-testid="gallery-grid"
        data-hovered={hovered}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className="group/grid mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence mode="popLayout">
          {visible.map((work, i) => (
            // This motion element IS the grid item. Framer Motion cannot measure a
            // `display: contents` element, so wrapping the card in one would silently
            // kill layout animation.
            <motion.div
              key={work.id}
              data-work-id={work.id}
              layout={level === 'full'}
              // The offset was gated on motion level but the fade was not, so every card
              // rendered at opacity 0 — including on the server, where getServerSnapshot
              // reports 'reduced' precisely so a visitor without JS keeps visible content.
              // The whole gallery was invisible until framer-motion hydrated. Gated the
              // same way WeaveReveal does it: under reduced motion there is no `initial`
              // at all, rather than an initial that happens to animate quickly.
              initial={
                level === 'reduced'
                  ? undefined
                  : { opacity: 0, x: level === 'full' ? (i % 2 ? 32 : -32) : 0 }
              }
              animate={level === 'reduced' ? undefined : { opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: i * stagger, ease: [0.22, 1.2, 0.36, 1] }}
              className={`relative ${CARD_ASPECT}`}
            >
              <GalleryCard
                work={work}
                index={WORKS.indexOf(work)}
                eager={isEager(i)}
                onOpen={onOpen}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
