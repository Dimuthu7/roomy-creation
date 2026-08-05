'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { clampPercent } from '@/lib/clamp'
import { workAlt } from '@/lib/workAlt'
import { aspectClass } from '@/lib/aspect'
import type { Work } from '@/data/works'

export function BeforeAfterSlider({ work }: { work: Work }) {
  const [percent, setPercent] = useState(50)
  const frameRef = useRef<HTMLDivElement>(null)

  if (!work.beforeImage) {
    return (
      <div className={`relative ${aspectClass(work.ratio)} w-full`}>
        <Image src={work.image} alt={workAlt(work)} fill sizes="90vw" className="object-cover" />
      </div>
    )
  }

  const setFromClientX = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    setPercent(clampPercent(((clientX - rect.left) / rect.width) * 100))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowRight') setPercent((p) => clampPercent(p + step))
    else if (e.key === 'ArrowLeft') setPercent((p) => clampPercent(p - step))
    else if (e.key === 'Home') setPercent(0)
    else if (e.key === 'End') setPercent(100)
    else return
    e.preventDefault()
    // The lightbox binds the same arrow keys to move between works, and this handle
    // renders inside it. Left to bubble, one nudge of the comparison would also swap
    // the work being compared.
    e.stopPropagation()
  }

  return (
    <div
      ref={frameRef}
      // `touch-pan-y` lets a vertical swipe still scroll the page while a horizontal drag
      // belongs to the slider. Without a touch-action rule the browser claims the gesture
      // and the slider cannot be dragged on a phone at all.
      className={`relative ${aspectClass(work.ratio)} w-full touch-pan-y select-none overflow-hidden`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setFromClientX(e.clientX)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientX(e.clientX)
      }}
    >
      <Image
        src={work.beforeImage}
        alt={`${work.title} before installation, bare wall`}
        fill
        sizes="90vw"
        className="object-cover"
      />
      <div
        data-testid="after-reveal"
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${percent}%)` }}
      >
        <Image src={work.image} alt={workAlt(work)} fill sizes="90vw" className="object-cover" />
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare before and after installation"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 z-10 w-1 -translate-x-1/2 cursor-ew-resize bg-yellow"
        style={{ left: `${percent}%` }}
      >
        <span className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow bg-navy" />
      </div>
    </div>
  )
}
