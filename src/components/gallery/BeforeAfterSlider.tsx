'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { animate, type AnimationPlaybackControls } from 'framer-motion'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { clampPercent } from '@/lib/clamp'
import { workAlt } from '@/lib/workAlt'
import { aspectClass } from '@/lib/aspect'
import type { Work } from '@/data/works'

// F3: public/work/ does not exist yet, so every image below renders broken in a
// real browser. Reuses Hero and Film's onError stand-in pattern: a solid navy block
// naming the exact slot, never an AI image. This shared row is what a fallback block
// looks like at each of the three call sites below — each keeps its own failed flag
// so one image's failure never hides another that is still loading fine.
function ImageFallback({ testId, slot }: { testId: string; slot: string }) {
  return (
    <div data-testid={testId} className="absolute inset-0 flex items-center justify-center bg-navy">
      <span className="u-mono px-4 text-center text-sky">Image slot: {slot}</span>
    </div>
  )
}

// One gentle sweep of the handle shortly after a comparison opens, so a visitor can see
// it is draggable before they have touched it. Plays once per work; any pointer or key
// interaction stops it on the spot and hands the handle over.
const HINT_KEYFRAMES = [50, 62, 40, 50]
const HINT_DELAY_S = 0.6
const HINT_DURATION_S = 1.4

export function BeforeAfterSlider({ work }: { work: Work }) {
  const [percent, setPercent] = useState(50)
  const level = useMotionLevel()
  const hintRef = useRef<AnimationPlaybackControls | null>(null)
  const hasComparison = Boolean(work.beforeImage)

  useEffect(() => {
    if (!hasComparison || level === 'reduced') return
    const controls = animate(50, HINT_KEYFRAMES, {
      delay: HINT_DELAY_S,
      duration: HINT_DURATION_S,
      ease: 'easeInOut',
      onUpdate: setPercent,
    })
    hintRef.current = controls
    return () => {
      controls.stop()
      hintRef.current = null
    }
  }, [hasComparison, level])

  const stopHint = () => {
    hintRef.current?.stop()
    hintRef.current = null
  }
  const [singleFailed, setSingleFailed] = useState(false)
  const [beforeFailed, setBeforeFailed] = useState(false)
  const [afterFailed, setAfterFailed] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  if (!work.beforeImage) {
    return (
      <div className={`relative ${aspectClass(work.ratio)} w-full`}>
        {singleFailed ? (
          <ImageFallback testId="slider-fallback" slot={work.image} />
        ) : (
          <Image
            src={work.image}
            alt={workAlt(work)}
            fill
            sizes="90vw"
            className="object-cover"
            onError={() => setSingleFailed(true)}
          />
        )}
      </div>
    )
  }

  const setFromClientX = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    setPercent(clampPercent(((clientX - rect.left) / rect.width) * 100))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    stopHint()
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
        stopHint()
        e.currentTarget.setPointerCapture(e.pointerId)
        setFromClientX(e.clientX)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientX(e.clientX)
      }}
    >
      {beforeFailed ? (
        <ImageFallback testId="before-fallback" slot={work.beforeImage} />
      ) : (
        <Image
          src={work.beforeImage}
          alt={`${work.title} before installation, bare wall`}
          fill
          sizes="90vw"
          className="object-cover"
          onError={() => setBeforeFailed(true)}
        />
      )}
      <div
        data-testid="after-reveal"
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${percent}%)` }}
      >
        {afterFailed ? (
          <ImageFallback testId="after-fallback" slot={work.image} />
        ) : (
          <Image
            src={work.image}
            alt={workAlt(work)}
            fill
            sizes="90vw"
            className="object-cover"
            onError={() => setAfterFailed(true)}
          />
        )}
      </div>

      {/* Which side is which. aria-hidden: the two images' alt text already says it. */}
      <span
        aria-hidden="true"
        className="u-mono pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-navy/80 px-3 py-1 text-paper"
      >
        Before
      </span>
      <span
        aria-hidden="true"
        className="u-mono pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-yellow px-3 py-1 text-navy"
      >
        After
      </span>
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
