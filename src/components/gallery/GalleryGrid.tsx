'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WORKS } from '@/data/works'
import type { CategoryId } from '@/data/categories'
import { filterWorks, rowSpan, offsetFor, isEager } from '@/lib/galleryLayout'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { FilterRow } from './FilterRow'
import { GalleryCard } from './GalleryCard'

/**
 * Rows of vertical gutter baked into every cell. Row-gap has to stay 0 — with
 * `gridAutoRows: 8px`, a row gap would be inserted between all N spanned rows and
 * inflate each card to `24N - 16` px, wrecking every aspect ratio. The gutter is
 * part of the cell instead, and the card insets itself by the same amount.
 */
export const GUTTER_ROWS = 2

const OFFSET_CLASS = {
  none: '',
  left: 'lg:-translate-x-6',
  right: 'lg:translate-x-6',
} as const

export function GalleryGrid({ onOpen }: { onOpen: (index: number) => void }) {
  const [active, setActive] = useState<CategoryId>('all')
  const [hovered, setHovered] = useState(false)
  const level = useMotionLevel()

  const visible = filterWorks(WORKS, active)
  // The interlock offsets are `lg:` only, and `lg` is the 3-column breakpoint, so the
  // phase is computed for 3 columns everywhere except mobile, where it is suppressed.
  const columns = level === 'mobile' ? 1 : 3
  const stagger = level === 'reduced' ? 0 : 0.025

  return (
    <div>
      <FilterRow active={active} onChange={setActive} />

      <motion.div
        layout={level === 'full'}
        data-testid="gallery-grid"
        data-hovered={hovered}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className="group/grid mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        style={{ gridAutoRows: '8px', columnGap: '1rem', rowGap: 0 }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map((work, i) => (
            // This motion element IS the grid item: it carries the row span and the
            // interlock offset. Framer Motion cannot measure a `display: contents`
            // element, so wrapping the card in one would silently kill layout animation.
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
              style={{ gridRowEnd: `span ${rowSpan(work.ratio) + GUTTER_ROWS}` }}
              className={`relative ${OFFSET_CLASS[offsetFor(i, columns)]}`}
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
