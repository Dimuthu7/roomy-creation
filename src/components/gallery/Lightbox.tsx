'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { useSiteData } from '@/context/SiteData'
import { CATEGORIES } from '@/data/categories'
import { nextIndex, prevIndex } from '@/lib/lightboxNav'
import { isTBC } from '@/lib/tbc'
import { useEnquiryPrefill } from '@/context/EnquiryPrefill'
import { BeforeAfterSlider } from './BeforeAfterSlider'

// Native <dialog> (showModal/close) is unimplemented in jsdom, so the trap, focus
// restore and scroll lock below are hand-rolled rather than delegated to the browser.
// A horizontal swipe has to travel at least this far, and further sideways than up or
// down, before it counts as "next/previous" rather than an attempt to scroll.
const SWIPE_MIN_PX = 50

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function specRow(label: string, value: string | undefined) {
  // `value === undefined` catches the category-label lookup, which is a plain string
  // union rather than a Maybe<T>, so isTBC alone would not cover it.
  if (isTBC(value) || value === undefined) return null
  return (
    <div key={label} className="flex justify-between gap-4 border-t border-teal/20 py-2">
      <dt className="u-mono text-sky/70">{label}</dt>
      <dd className="text-right text-paper">{value}</dd>
    </div>
  )
}

export function Lightbox({
  index,
  sequence,
  onClose,
  onIndexChange,
}: {
  index: number
  /** Indices into WORKS to page through, in order — the gallery's filtered view.
   *  Omitted (or not containing `index`), it pages through every work. */
  sequence?: number[]
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  // The component renders on the server too ('use client' only opts into hydration,
  // it does not skip SSR), where document does not exist. Gating on a post-mount
  // flag defers the portal and every document touch to the client.
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const reduced = useMotionLevel() === 'reduced'
  const { prefill } = useEnquiryPrefill()
  const { works } = useSiteData()
  const work = works[index]

  // Next/Previous used to walk the whole catalogue, so a visitor browsing "Kitchens"
  // was dropped into wardrobes on the first Next. Paging now stays inside the view the
  // lightbox was opened from.
  const order =
    sequence && sequence.includes(index) ? sequence : works.map((_, i) => i)
  const position = order.indexOf(index)
  const goNext = () => onIndexChange(order[nextIndex(position, order.length)])
  const goPrev = () => onIndexChange(order[prevIndex(position, order.length)])

  useEffect(() => {
    // The lint rule wants setState deferred to a callback, but there is no external
    // system to subscribe to here — this is the standard SSR/hydration mount gate
    // (see the `mounted` comment above), which has no callback-based equivalent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Declared before the effect that moves focus into the dialog, so it captures
  // document.activeElement before that happens, not after. Split from the move so
  // that losing focus restoration cannot silently also disable the initial focus.
  useEffect(() => {
    if (!mounted) return
    const previouslyFocused = document.activeElement
    return () => {
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [mounted])

  // Runs once the dialog has actually rendered (mounted flips true on the second
  // commit), not on the first pass where dialogRef.current is still null.
  useEffect(() => {
    if (!mounted) return
    dialogRef.current?.focus()
  }, [mounted])

  // `html`, not `body`, is the browser's actual root scrolling box in standards
  // mode — locking only `body.style.overflow` (the original bug) leaves `html`
  // free to scroll, which is what let the page behind the modal keep moving.
  // Lenis compounds this: it drives the lock by calling the real
  // `window.scrollTo`, so once both roots are unscrollable its calls become
  // no-ops too — no need to separately pause the Lenis instance.
  useEffect(() => {
    if (!mounted) return
    const previousHtml = document.documentElement.style.overflow
    const previousBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previousHtml
      document.body.style.overflow = previousBody
    }
  }, [mounted])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
      return
    }
    if (e.key !== 'Tab') return

    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const current = document.activeElement

    if (e.shiftKey) {
      if (current === first || current === dialog) {
        e.preventDefault()
        last.focus()
      }
    } else if (current === last || current === dialog) {
      e.preventDefault()
      first.focus()
    }
  }

  // Swipe left/right on the photo to page through works on a phone. Skipped for a
  // before/after work: there a horizontal drag belongs to the comparison slider.
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    swipeStart.current = work.beforeImage ? null : { x: t.clientX, y: t.clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0) goNext()
    else goPrev()
  }

  if (!mounted) return null

  const projectType = CATEGORIES.find((c) => c.id === work.category)?.label

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      // Lenis (SmoothScroll.tsx) listens for wheel/touch on `window` and calls
      // preventDefault to drive its own virtual scroll — without this attribute it
      // intercepts scroll gestures made over the modal too, before the browser ever
      // gets to natively scroll the content div below. `data-lenis-prevent` is
      // Lenis's own documented escape hatch: it makes Lenis skip preventDefault for
      // any event whose path includes this element, handing the gesture back to
      // native scrolling — which the `overflow-y-auto` content div then honours.
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/95 p-4"
    >
      {/* Opens with a short fade-and-settle rather than appearing in one frame. The
          backdrop stays a plain div so the click-outside check above keeps comparing
          against the element that owns the handler. */}
      <motion.div
        className="flex max-h-full w-full max-w-4xl flex-col gap-6 overflow-y-auto"
        initial={reduced ? undefined : { opacity: 0, scale: 0.96, y: 12 }}
        animate={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="lightbox-title" className="font-display text-2xl text-paper">
              {work.title}
            </h2>
            {order.length > 1 && (
              <p data-testid="lightbox-counter" className="u-mono mt-1 text-sky/70">
                {position + 1} / {order.length}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="u-mono text-sky hover:text-yellow">
            Close
          </button>
        </div>

        {/* A1: the slider owns its own per-image failure flags, and the element type and
            position do not change when `index` does — so without a key React keeps the
            instance and carries those flags into the next work. One 404 then suppressed
            every photo after it: the stand-in re-rendered with the new work's path and no
            request was ever made for a file that exists. Keying on the work id also
            resets the compare handle, which otherwise stayed where the last work left it. */}
        {/* Keyed on the work as well, so each new photo fades in rather than cutting. */}
        <motion.div
          key={work.id}
          data-testid="lightbox-media"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          initial={reduced ? undefined : { opacity: 0 }}
          animate={reduced ? undefined : { opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <BeforeAfterSlider key={work.id} work={work} />
        </motion.div>

        <dl className="flex flex-col">
          {specRow('Project type', projectType)}
          {specRow('Materials and finish', isTBC(work.materials) ? undefined : work.materials)}
          {specRow('Dimensions', isTBC(work.dimensions) ? undefined : work.dimensions)}
          {specRow('Hardware', isTBC(work.hardware) ? undefined : work.hardware)}
          {specRow('Property type', isTBC(work.propertyType) ? undefined : work.propertyType)}
          {specRow('District', isTBC(work.district) ? undefined : work.district)}
          {specRow('Year', isTBC(work.year) ? undefined : String(work.year))}
        </dl>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="u-mono rounded-full border border-teal/40 px-4 py-2 text-sky hover:border-teal"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              className="u-mono rounded-full border border-teal/40 px-4 py-2 text-sky hover:border-teal"
            >
              Next
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              prefill(work.category)
              onClose()
            }}
            className="u-mono rounded-full bg-yellow px-6 py-2 text-navy"
          >
            Enquire about something like this
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
