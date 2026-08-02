'use client'
import Image from 'next/image'
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
  const caption = [work.title, work.materials, work.district]
    .filter((p) => p !== undefined && !isTBC(p))
    .join(' · ')

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      data-cursor-label="View"
      // `bottom-4` is the vertical gutter: the cell is 2 rows (16px) taller than the
      // image needs, so the card's own height is exactly rowSpan(ratio) * 8.
      className="group absolute inset-x-0 top-0 bottom-4 block overflow-hidden text-left
                 transition-opacity duration-300
                 group-data-[hovered=true]/grid:opacity-40 hover:!opacity-100"
    >
      <Image
        src={work.image}
        alt={workAlt(work)}
        fill
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
        loading={eager ? 'eager' : 'lazy'}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-navy/90 p-4
                   transition-transform duration-300 group-hover:translate-y-0"
      >
        <span className="u-mono block text-sky">{caption}</span>
        <span className="mt-2 block h-px w-full bg-teal" />
      </span>
    </button>
  )
}
