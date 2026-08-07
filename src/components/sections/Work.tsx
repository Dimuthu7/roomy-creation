'use client'
import { useState } from 'react'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { Lightbox } from '@/components/gallery/Lightbox'

// Nothing owned the open/close state that GalleryGrid and Lightbox each expect a
// caller to hold — this is the client component that does. Pushed down from
// page.tsx (a server component) rather than lifted, since this is the only new
// piece of the page that needs state.
export function Work() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="work" aria-labelledby="work-heading" className="bg-navy py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* F2: the gallery — the client's stated number-one priority — was not
            reachable by heading navigation at all. Structural label, not a claim —
            flagged for sign-off, brief §8. */}
        <h2
          id="work-heading"
          className="font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl"
        >
          Our work
        </h2>
        <GalleryGrid onOpen={setOpenIndex} />
      </div>

      {openIndex !== null && (
        <Lightbox
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      )}
    </section>
  )
}
