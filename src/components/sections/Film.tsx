'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cardIndexAt } from '@/lib/filmCards'
import { CLIP_STARTS, FILM_CARDS } from '@/data/specs'
import { isTBC } from '@/lib/tbc'
import { useMotionLevel } from '@/hooks/useMotionLevel'

gsap.registerPlugin(ScrollTrigger)

export function Film() {
  const level = useMotionLevel()
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const active = FILM_CARDS[activeIndex]

  // The client's rule: cards switch from the video's own clock. currentTime is read
  // here, never assigned — seeking from this handler would let something else (scroll,
  // a resize, anything) drive the footage, which is the one thing that is off the table.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    function handleTimeUpdate() {
      setActiveIndex(cardIndexAt(el!.currentTime, CLIP_STARTS))
    }
    el.addEventListener('timeupdate', handleTimeUpdate)
    return () => el.removeEventListener('timeupdate', handleTimeUpdate)
  }, [])

  // Scroll pins the section and zooms the frame around the video — the footage inside
  // it never moves. This only runs at 'full': the frame's resting class below is
  // already full size, so mobile and reduced-motion visitors see the correct end state
  // without the animation ever having to run.
  //
  // useLayoutEffect, not useEffect: ScrollTrigger's pin wraps the section in a
  // "pin-spacer" div, reparenting it. React records the section's parent at mount and
  // uses that record to detach it on unmount. A passive-effect revert runs after
  // React's own DOM-removal step and is too late — the spacer is still there and
  // removal throws "node not a child of this node". A layout-effect cleanup runs
  // synchronously before React mutates the DOM, so revert() restores the original
  // structure in time.
  useLayoutEffect(() => {
    if (level !== 'full') return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        frameRef.current,
        { scale: 0.85 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=100%',
            scrub: true,
            pin: true,
          },
        },
      )
      gsap.to('[data-film-headline="top"]', {
        yPercent: -100,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=100%',
          scrub: true,
        },
      })
      gsap.to('[data-film-headline="bottom"]', {
        yPercent: 100,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=100%',
          scrub: true,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [level])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-navy py-24 text-paper">
      <div data-film-headline="top" className="relative z-10 px-6 text-center">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">How a Roomy piece</h2>
        <div className="mx-auto mt-6 h-0.5 w-16 bg-teal" />
      </div>

      <div className="relative mx-auto my-12 max-w-5xl px-6">
        <div
          ref={frameRef}
          data-testid="film-frame"
          className="relative aspect-[16/9] w-full scale-100 overflow-hidden rounded-lg"
        >
          {failed ? (
            <div
              data-testid="film-fallback"
              className="absolute inset-0 flex items-center justify-center bg-navy"
            >
              <span className="text-sm text-sky">Film slot: /film/roomy-process.mp4</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              src="/film/roomy-process.mp4"
              poster="/film/roomy-process-poster.jpg"
              muted
              loop
              playsInline
              autoPlay={level !== 'reduced'}
              aria-label="Film showing the measure, cut, fit and handover of a Roomy Creations build"
              onError={() => setFailed(true)}
            />
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-navy/90 to-transparent p-6">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-medium text-yellow">{active.counter}</span>
              <span className="text-sm tracking-wide text-sky uppercase">{active.label}</span>
            </div>
            {!isTBC(active.figure) && (
              <span className="text-3xl font-semibold text-yellow">{active.figure}</span>
            )}
            {!isTBC(active.line) && (
              <p data-film-line className="text-base text-paper">
                {active.line}
              </p>
            )}
          </div>
        </div>
      </div>

      <div data-film-headline="bottom" className="relative z-10 px-6 text-center">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">comes together</h2>
      </div>
    </section>
  )
}
