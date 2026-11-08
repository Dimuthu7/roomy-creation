'use client'
import Image from 'next/image'
import { Fragment, useEffect, useState } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'

// Past this many pixels the cue has served its purpose — the visitor is already
// scrolling — so it fades rather than lingering over whatever section comes next.
const SCROLL_CUE_FADE_THRESHOLD = 50

const HEADLINE = 'We measure your wall, then build to it.'
// Entrance timing, in seconds: the headline lands word by word, then the sub-line, then
// the buttons. Kept short so the whole sequence is done in about a second.
const WORD_STAGGER = 0.07
const HEADLINE_END = HEADLINE.split(' ').length * WORD_STAGGER

// The entrance is a CSS animation (globals.css, .hero-rise), not framer-motion: the hero
// is server-rendered, and a CSS animation plays straight from that first HTML — no
// waiting for hydration, and nothing left invisible if JS never runs. It only exists
// inside a prefers-reduced-motion: no-preference query, so a reduced-motion visitor
// gets the hero fully in place with no transform at all.
function rise(delay: number): React.CSSProperties {
  return { animationDelay: `${delay.toFixed(2)}s` }
}

// D1: /media/hero-master.jpg and /media/cutout-sofa.png do not exist yet. The probe
// confirmed next/image renders a broken <img> and never throws on a missing file, so
// without an explicit fallback the LCP element — the first thing any visitor sees —
// would be blank. This reuses Film.tsx's stand-in pattern: onError flips a flag and a
// solid navy block names the exact slot instead. The sofa cutout is aria-hidden
// decoration rather than the LCP element, so its stand-in is simply rendering nothing.
export function Hero() {
  const [masterFailed, setMasterFailed] = useState(false)
  const [cutoutFailed, setCutoutFailed] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const level = useMotionLevel()

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > SCROLL_CUE_FADE_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Matches EnquiryPrefill's prefill(): an explicit `behavior` here beats the CSS
  // `scroll-behavior` reduced-motion guard, so it has to be computed rather than left
  // at the default 'smooth'.
  function scrollToPosition(e: React.MouseEvent) {
    e.preventDefault()
    document.getElementById('position')?.scrollIntoView({
      behavior: level === 'reduced' ? 'auto' : 'smooth',
    })
  }

  function scrollToWork(e: React.MouseEvent) {
    e.preventDefault()
    document.getElementById('work')?.scrollIntoView({
      behavior: level === 'reduced' ? 'auto' : 'smooth',
    })
  }

  function scrollToEnquiry(e: React.MouseEvent) {
    e.preventDefault()
    document.getElementById('enquiry')?.scrollIntoView({
      behavior: level === 'reduced' ? 'auto' : 'smooth',
    })
  }

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative flex min-h-screen items-center overflow-hidden bg-navy"
    >
      {masterFailed ? (
        <div data-testid="hero-fallback" className="absolute inset-0 flex items-center justify-center bg-navy">
          <span className="text-sm text-sky">Image slot: /media/hero-master.jpg</span>
        </div>
      ) : (
        <Image
          src="/media/hero-master.jpg"
          alt="Fitted wardrobes and upholstered seating in a daylit living room"
          fill
          // `priority` is deprecated in Next 16. Its successor `preload` inserts a
          // <link rel="preload"> in the head, which is redundant for an image already
          // in the initial markup — so the docs steer to these two instead
          // (03-api-reference/02-components/image.md, under `preload`).
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
          onError={() => setMasterFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-navy/72" />
      <HeroBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-12">
        {/* D2: pure white is not in the brand palette. text-paper carries display
            type on navy, text-sky carries body copy. */}
        <h1
          id="hero-heading"
          className="text-extrude max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-paper lg:text-7xl"
        >
          {HEADLINE.split(' ').map((word, i) => (
            <Fragment key={i}>
              <span className="hero-rise inline-block" style={rise(i * WORD_STAGGER)}>
                {word}
              </span>{' '}
            </Fragment>
          ))}
        </h1>
        {/* A5: text-paper, not text-sky. Measured against the delivered hero photo
            through the navy/72% overlay, text-sky lands at 4.20:1 where AA needs 4.5;
            text-paper reaches 5.94. The deliberate exception to D2 below — taken over
            darkening the overlay, which would have dimmed the photograph itself. */}
        <p className="hero-rise mt-6 max-w-xl text-paper" style={rise(HEADLINE_END)}>
          Built-in wardrobes, pantry cupboards and upholstered seating, cut to the room you
          actually have.
        </p>
        <div
          className="hero-rise mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap"
          style={rise(HEADLINE_END + 0.15)}
        >
          <a
            href="#enquiry"
            onClick={scrollToEnquiry}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow px-7 py-4 font-display text-navy transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow/30 focus-visible:-translate-y-0.5 active:scale-95 sm:w-auto"
          >
            Request a quotation
            <span
              aria-hidden="true"
              className="-translate-x-2 opacity-0 transition duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
            >
              →
            </span>
          </a>
          {/* A5: border-sky, not border-teal, as the resting state. Teal measures
              2.28:1 against the hero photo where WCAG 1.4.11 needs 3:1 for a control
              boundary, and darkening the overlay cannot save it — swept to 88% it
              still only reaches 2.88. Sky clears at 3.45 with the overlay left where
              it is. The hover/focus state brightens to paper (5.94:1), strictly
              higher contrast than the resting state, so it carries no new risk. */}
          <a
            href="#work"
            onClick={scrollToWork}
            className="flex w-full items-center justify-center rounded-full border border-sky px-7 py-4 font-display text-sky transition duration-300 ease-out hover:-translate-y-0.5 hover:border-paper hover:text-paper hover:shadow-lg hover:shadow-sky/20 focus-visible:-translate-y-0.5 active:scale-95 sm:w-auto"
          >
            See our work
          </a>
        </div>
      </div>

      {!cutoutFailed && (
        // Shrunk from 38vw and darkened to match the dimmed backdrop it sits over —
        // full-opacity and half-viewport-wide, it was the only sharp, undimmed thing
        // in the hero and read as "this is a sofa company." Softening it (rather than
        // lightening bg-navy/72 above) keeps the A5-measured text contrast untouched.
        <div className="pointer-events-none absolute -right-10 bottom-0 hidden w-[26vw] lg:block">
          <Image
            data-testid="hero-cutout"
            src="/media/cutout-sofa.png"
            alt=""
            aria-hidden="true"
            width={900}
            height={600}
            className="h-auto w-full brightness-[0.92] drop-shadow-2xl"
            onError={() => setCutoutFailed(true)}
          />
        </div>
      )}

      {/* text-sky / hover:text-paper reuses the secondary CTA's own measured pairing
          (A5, above) — sky clears WCAG 1.4.11's 3:1 non-text threshold against this
          photo, paper clears it by a wider margin still. pointer-events-none + tabindex
          -1 once faded keep an invisible link out of the tab order rather than leaving
          a dead stop for keyboard visitors. href points at #position (the section that
          actually follows the hero) with an onClick smooth-scroll override — Position,
          not Work, is what a visitor scrolling straight down would reach next. */}
      <a
        href="#position"
        onClick={scrollToPosition}
        aria-label="Scroll down"
        tabIndex={pastHero ? -1 : undefined}
        className={`absolute inset-x-0 bottom-8 z-10 flex justify-center text-sky
                    transition-opacity duration-300 hover:text-paper focus-visible:text-paper
                    ${pastHero ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        <ChevronDownIcon />
      </a>
    </section>
  )
}

// Replaces the tiled weave pattern (WeaveTexture), which read as clutter over the
// photo at hero scale — the same reason it was pulled from Position's background.
// A vignette darkens the frame and fine grain adds texture, without a repeating
// shape competing with the photo or the headline.
function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 38%, rgba(2,48,72,0.6) 100%)',
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-50 mix-blend-overlay">
        <filter id="hero-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>
    </div>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-scroll-cue"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
