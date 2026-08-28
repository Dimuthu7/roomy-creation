'use client'
import Image from 'next/image'
import { useState } from 'react'
import { workAlt } from '@/lib/workAlt'
import { isTBC } from '@/lib/tbc'
import type { Work } from '@/data/works'

export function GalleryCard({
  work,
  index,
  eager,
  onOpen,
}: {
  work: Work
  /** Index into WORKS — the lightbox indexes the full array, not the filtered view. */
  index: number
  /** Decided by the grid from the visible position, so a filtered view still loads
   *  its above-the-fold images eagerly. */
  eager: boolean
  onOpen: (index: number) => void
}) {
  // data/works.ts only lists slots that actually have a photo in public/work/,
  // so a load failure here means a real photo went missing at runtime, not an
  // unfilled slot. There is nothing useful to show a visitor in that case — no
  // internal filename, no stand-in box — so the card just disappears.
  const [failed, setFailed] = useState(false)

  const caption = [work.title, work.materials, work.district]
    .filter((p) => p !== undefined && !isTBC(p))
    .join(' · ')

  if (failed) return null

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      data-cursor-label="View"
      className="group absolute inset-0 block overflow-hidden text-left
                 transition duration-300
                 group-data-[hovered=true]/grid:opacity-40 hover:!opacity-100 active:scale-[0.97]"
    >
      <Image
        src={work.image}
        alt={workAlt(work)}
        fill
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
        loading={eager ? 'eager' : 'lazy'}
        className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
        onError={() => setFailed(true)}
      />
      <span
        // Both translate classes are motion-safe: under reduced motion the caption gets
        // no translate at all and sits permanently visible at the bottom of the card,
        // rather than merely snapping there instantly on hover.
        className="pointer-events-none absolute inset-x-0 bottom-0 motion-safe:translate-y-full bg-navy/90 p-4
                   transition-transform duration-300 motion-safe:group-hover:translate-y-0"
      >
        <span className="u-mono block text-sky">{caption}</span>
        <span className="mt-2 block h-px w-full bg-teal" />
      </span>
    </button>
  )
}
