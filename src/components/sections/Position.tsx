'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { WeaveThreadNode } from '@/components/weave/WeaveThread'
import { WeaveTexture } from '@/components/weave/WeaveTexture'
import { activeScrollStep } from '@/lib/scrollProgress'
import { useMotionLevel } from '@/hooks/useMotionLevel'

interface Point {
  main: string
  sub?: string
}

// D8: the plan described this section only as "three short lines... what we make, who
// we make it for, and the fit argument" with no copy supplied. The first main+sub pair
// and the first closing line are NOT client-approved and are flagged for sign-off —
// see the Task 14 brief. The second main+sub pair and second closing line were added
// afterward (durability, team continuity), same not-yet-approved status — see
// docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md. Grouped into
// four points — two carry a supporting sub-line, two are standalone statements — so a
// point's main and sub load and scroll together as one unit rather than as separate
// steps.
const POINTS: Point[] = [
  {
    main: 'We make built-in furniture for homes, apartments, hotels and offices.',
    sub: 'Every piece is measured on site before anything is cut.',
  },
  {
    main: 'A standard-size unit leaves gaps. A fitted one does not.',
  },
  {
    main: 'Every material is chosen to last, not just to look good on day one.',
    sub: 'The same team measures, builds and installs — start to finish.',
  },
  {
    main: 'Fit it once. It will not need fitting again.',
  },
]

// Opener and closer alternate per point (point 0, 2 open; point 1, 3 close) — both
// earn display type, since each is the only line on screen for its point and needs
// to carry that weight alone. The sub-line, when a point has one, steps down to body
// copy instead of shouting at the same volume as its neighbours. That step down also
// carries text-sky rather than text-paper — on solid navy (no photo overlay to dim
// it, unlike Hero) sky measures 7.8:1, well past the 4.5:1 AA floor, so it reads
// quieter without reading as low-contrast. Never text-white on any line.
const STYLE_OPENER =
  'font-display text-2xl font-medium leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl'
const STYLE_SUB = 'max-w-md font-body text-base leading-relaxed text-sky sm:text-lg'
const STYLE_CLOSER =
  'font-display text-2xl font-semibold leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl'

function mainStyle(pointIndex: number): string {
  return pointIndex % 2 === 0 ? STYLE_OPENER : STYLE_CLOSER
}

// Pinned scroll-reveal only runs at full motion — position: sticky plus a scroll
// listener is exactly the kind of transform-heavy effect the client's reduced-motion
// rule disables outright, and pinned/scroll-jacked sections are also the pattern most
// prone to going janky on small touch viewports (address-bar collapse, momentum
// scroll fighting the pin). Reduced motion and mobile both get CompactPosition
// instead: the whole statement laid out normally, still scroll-revealed, just not
// scroll-jacked.
export function Position() {
  const level = useMotionLevel()
  return level === 'full' ? <PinnedPosition /> : <CompactPosition />
}

const STAGGER = 0.15

function CompactPosition() {
  const rows = POINTS.flatMap((point, i) => {
    const entries = [{ key: `${i}-main`, text: point.main, className: mainStyle(i) }]
    if (point.sub) entries.push({ key: `${i}-sub`, text: point.sub, className: STYLE_SUB })
    return entries
  })

  return (
    <section aria-label="Position" className="relative overflow-hidden bg-navy py-28">
      <WeaveTexture />
      <div className="relative z-10 mx-auto grid max-w-4xl grid-cols-[1.25rem_1fr] gap-x-4 gap-y-[var(--pos-gap)] px-6 [--pos-gap:2.5rem] sm:grid-cols-[2rem_1fr] sm:gap-x-8 sm:[--pos-gap:3rem] lg:[--pos-gap:3.5rem]">
        {rows.map((row, i) => {
          const delay = i * STAGGER
          return (
            <Fragment key={row.key}>
              <WeaveThreadNode delay={delay} hasNext={i < rows.length - 1} gap="var(--pos-gap)" />
              <WeaveReveal from={i % 2 === 0 ? 'left' : 'right'} delay={delay}>
                <p className={row.className}>{row.text}</p>
              </WeaveReveal>
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}

// The scroll distance (in viewport heights) spent pinned on each point before the
// next one takes over. Tunable in one place — smaller reads snappier, larger gives
// more time per point.
const STEP_VH = 55

function PinnedPosition() {
  const trackRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    function onScroll() {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      setActive(activeScrollStep(rect.top, rect.height, window.innerHeight, POINTS.length))
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      aria-label="Position"
      ref={trackRef}
      className="relative bg-navy"
      style={{ height: `${STEP_VH * POINTS.length}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <WeaveTexture />
        <div className="relative z-10 mx-auto grid w-full max-w-4xl px-6">
          {POINTS.map((point, i) => {
            const isActive = active === i
            const offscreenY = active > i ? -16 : 16
            return (
              <div key={point.main} className="[grid-area:1/1] space-y-3">
                <motion.p
                  className={mainStyle(i)}
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : offscreenY }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {point.main}
                </motion.p>
                {point.sub && (
                  <motion.p
                    className={STYLE_SUB}
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : offscreenY }}
                    transition={{ duration: 0.4, delay: isActive ? 0.15 : 0, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {point.sub}
                  </motion.p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
