'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSiteData } from '@/context/SiteData'
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

export function GalleryGrid({
  onOpen,
}: {
  /** `sequence` is every visible work's index into WORKS, in grid order — the
   *  lightbox steps through that, so Next/Previous stay inside the active filter. */
  onOpen: (index: number, sequence: number[]) => void
}) {
  const [active, setActive] = useState<CategoryId>('all')
  const [hovered, setHovered] = useState(false)
  const level = useMotionLevel()
  const { works } = useSiteData()

  const visible = filterWorks(works, active)
  const categories = visibleCategories(works)
  const sequence = visible.map((work) => works.indexOf(work))
  const openInSequence = (index: number) => onOpen(index, sequence)
  const stagger = level === 'reduced' ? 0 : 0.025

  return (
    <div>
      {/* Sticky within this outer div's bounds: pinned flush under the fixed nav
          while the grid below scrolls past, then released the moment this div's own
          bottom — the end of the grid — reaches that point. The offset is the nav's
          live height, which Nav.tsx publishes as --nav-height: the bar shrinks from
          65px to about 53px once the page scrolls, so a fixed 65px left a strip of
          photos showing through between the two bars. 65px stays as the fallback
          for the first paint, before Nav has measured itself. bg-navy stops the
          grid's images showing through while pinned. */}
      <div className="sticky top-[var(--nav-height,65px)] z-40 bg-navy py-3">
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
                index={works.indexOf(work)}
                eager={isEager(i)}
                onOpen={openInSequence}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
