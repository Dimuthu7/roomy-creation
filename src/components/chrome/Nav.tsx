'use client'

import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { useMotionLevel } from '@/hooks/useMotionLevel'

// Not client-approved — flagged for sign-off, brief §8. "Process" names the #how
// section, whose own heading reads "How we work"; the nav keeps the shorter word a
// visitor scans for.
const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#how', label: 'Process' },
  { href: '#materials', label: 'Materials' },
] as const

// Past this many pixels the bar has visibly left the hero, so it's fair to shrink it;
// scrolling back below it restores the resting size.
const SCROLL_SHRINK_THRESHOLD = 24

// The back-out easing (overshoot then settle) is what gives the grow-back-to-top
// motion its "zoom" pop, rather than a flat linear resize.
const SHRINK_TRANSITION = 'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]'

export function Nav() {
  const level = useMotionLevel()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Reduced motion keeps the bar at its resting, full size always — the same "safe
    // state: content visible, nothing transformed" contract useMotionLevel itself
    // documents for this case.
    if (level === 'reduced') return
    const onScroll = () => setScrolled(window.scrollY > SCROLL_SHRINK_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [level])

  // Plain anchors jump instantly with no easing. Matches Hero's own scroll cue and
  // the enquiry prefill's scrollIntoView pattern — an explicit `behavior` here beats
  // the CSS `scroll-behavior` reduced-motion guard, so it's computed from `level`
  // rather than left at the default 'smooth'.
  function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    document.querySelector(href)?.scrollIntoView({
      behavior: level === 'reduced' ? 'auto' : 'smooth',
    })
  }

  return (
    <>
      {/* F2 skip link: without it, every keyboard visitor tabs the whole nav before
          reaching content. Hidden until :focus-visible, then visible above the bar. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4
                   focus-visible:left-4 focus-visible:z-[60] focus-visible:rounded
                   focus-visible:bg-yellow focus-visible:px-4 focus-visible:py-2
                   focus-visible:font-display focus-visible:text-navy"
      >
        Skip to content
      </a>

      {/* z-50: sits above a navy hero. The hairline is what keeps it visible at rest
          against a navy section beneath it. */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b border-teal/30 ${SHRINK_TRANSITION} ${
          scrolled ? 'bg-navy/95 shadow-lg shadow-navy/30 backdrop-blur-sm' : 'bg-navy'
        }`}
      >
        <nav
          aria-label="Primary"
          className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 ${SHRINK_TRANSITION} ${
            scrolled ? 'py-2.5' : 'py-4'
          }`}
        >
          <a
            href="#top"
            className={`shrink-0 origin-left ${SHRINK_TRANSITION} ${scrolled ? 'scale-90' : 'scale-100'}`}
          >
            <Logo variant="yellow" />
          </a>

          {/* No hamburger drawer: four anchors fit in a horizontally scrollable row on
              a narrow viewport, and a drawer is a focus-trap this component would then
              have to build, test and maintain for four links. The CTA stays in this
              same row so it is always visible, never hidden behind a toggle. */}
          <div className="flex items-center gap-6 overflow-x-auto">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="u-mono shrink-0 whitespace-nowrap text-sky transition-opacity duration-150 hover:text-yellow active:opacity-60"
              >
                {link.label}
              </a>
            ))}
            {/* The CTA is the one control on this bar — never teal text on navy for a
                control, teal is 2.7:1 and a line/edge colour only. */}
            <a
              href="#enquiry"
              onClick={(e) => scrollToSection(e, '#enquiry')}
              className="shrink-0 rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy whitespace-nowrap transition-transform duration-150 active:scale-95"
            >
              Request a quotation
            </a>
          </div>
        </nav>
      </header>
    </>
  )
}
