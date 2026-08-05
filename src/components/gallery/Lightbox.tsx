'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WORKS } from '@/data/works'
import { CATEGORIES } from '@/data/categories'
import { nextIndex, prevIndex } from '@/lib/lightboxNav'
import { isTBC } from '@/lib/tbc'
import { useEnquiryPrefill } from '@/context/EnquiryPrefill'
import { BeforeAfterSlider } from './BeforeAfterSlider'

// Native <dialog> (showModal/close) is unimplemented in jsdom, so the trap, focus
// restore and scroll lock below are hand-rolled rather than delegated to the browser.
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
  onClose,
  onIndexChange,
}: {
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  // The component renders on the server too ('use client' only opts into hydration,
  // it does not skip SSR), where document does not exist. Gating on a post-mount
  // flag defers the portal and every document touch to the client.
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const { prefill } = useEnquiryPrefill()
  const work = WORKS[index]

  useEffect(() => {
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

  useEffect(() => {
    if (!mounted) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mounted])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onIndexChange(nextIndex(index, WORKS.length))
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onIndexChange(prevIndex(index, WORKS.length))
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/95 p-4"
    >
      <div className="flex max-h-full w-full max-w-4xl flex-col gap-6 overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 id="lightbox-title" className="font-display text-2xl text-paper">
            {work.title}
          </h2>
          <button type="button" onClick={onClose} className="u-mono text-sky hover:text-yellow">
            Close
          </button>
        </div>

        <BeforeAfterSlider work={work} />

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
              onClick={() => onIndexChange(prevIndex(index, WORKS.length))}
              className="u-mono rounded-full border border-teal/40 px-4 py-2 text-sky hover:border-teal"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onIndexChange(nextIndex(index, WORKS.length))}
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
      </div>
    </div>,
    document.body,
  )
}
