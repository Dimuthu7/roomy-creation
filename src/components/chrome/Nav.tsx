'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Logo } from './Logo'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { logout } from '@/app/admin/actions'

// Not client-approved — flagged for sign-off, brief §8. "Process" names the #how
// section, whose own heading reads "How we work"; the nav keeps the shorter word a
// visitor scans for.
const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#how', label: 'Process' },
  { href: '#materials', label: 'Materials' },
] as const

// Shared by every non-CTA nav item, marketing or admin, so the two variants
// look identical apart from their labels/targets.
const LINK_CLASS =
  'u-mono shrink-0 whitespace-nowrap text-sky transition-opacity duration-150 hover:text-yellow active:opacity-60'

// Past this many pixels the bar has visibly left the hero, so it's fair to shrink it;
// scrolling back below it restores the resting size.
const SCROLL_SHRINK_THRESHOLD = 24

// The back-out easing (overshoot then settle) is what gives the grow-back-to-top
// motion its "zoom" pop, rather than a flat linear resize.
const SHRINK_TRANSITION = 'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]'

export function Nav() {
  const level = useMotionLevel()
  const reduced = level === 'reduced'
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  // The login screen has no session yet, so "Home"/"Sign out" would either bounce
  // straight back to it (proxy.ts) or destroy nothing — SiteChrome hides this whole
  // bar there instead, so this component only ever sees the two other cases.
  const isAdmin = pathname.startsWith('/admin')

  useEffect(() => {
    // Reduced motion keeps the bar at its resting, full size always — the same "safe
    // state: content visible, nothing transformed" contract useMotionLevel itself
    // documents for this case.
    if (reduced) return
    const onScroll = () => setScrolled(window.scrollY > SCROLL_SHRINK_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduced])

  // Plain anchors jump instantly with no easing. Matches Hero's own scroll cue and
  // the enquiry prefill's scrollIntoView pattern — an explicit `behavior` here beats
  // the CSS `scroll-behavior` reduced-motion guard, so it's computed from `level`
  // rather than left at the default 'smooth'.
  function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    setMenuOpen(false)
    document.querySelector(href)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
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
          className={`mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 ${SHRINK_TRANSITION} ${
            scrolled ? 'py-2.5' : 'py-4'
          }`}
        >
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin ? (
              <Link
                href="/admin"
                className={`origin-left ${SHRINK_TRANSITION} ${scrolled ? 'scale-90' : 'scale-100'}`}
              >
                <Logo variant="yellow" />
              </Link>
            ) : (
              <a
                href="#top"
                onClick={(e) => scrollToSection(e, '#top')}
                className={`origin-left ${SHRINK_TRANSITION} ${scrolled ? 'scale-90' : 'scale-100'}`}
              >
                <Logo variant="yellow" />
              </a>
            )}
            {/* Stands in for the removed "Roomy Creations — Admin" page header — the
                one place that told an admin which mode they were in. */}
            {isAdmin && (
              <span className="u-mono rounded-full border border-yellow/50 px-2 py-0.5 text-yellow">
                Admin
              </span>
            )}
          </div>

          {/* Below `sm:` this is the only other thing in the bar's first row, so it
              lands top-right against the logo for free via `justify-between` — no CTA
              competing for that row on mobile any more; the CTA moved into the panel
              below instead. */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-sky transition-transform duration-150 active:scale-95 sm:hidden"
          >
            <MenuIcon open={menuOpen} />
          </button>

          {/* One set of links and one CTA, not two: `w-full` plus the nav's own
              `flex-wrap` is what drops this onto its own row below `sm:`, so there is
              nothing to duplicate between the mobile panel and the desktop row —
              `sm:flex` just makes it part of the same row again, CTA included. The
              open/close animation is a max-height + opacity transition rather than a
              hidden/flex swap, since a plain display toggle cannot animate; reduced
              motion drops straight to instant per the same contract every other
              transition in this file follows. */}
          <div
            id="mobile-nav-panel"
            className={`flex w-full flex-col items-start gap-1 overflow-hidden border-t border-teal/30 sm:order-1 sm:w-auto sm:flex-row sm:items-center sm:gap-6 sm:overflow-visible sm:border-0 sm:!max-h-none sm:!opacity-100 sm:!pt-0 ${
              reduced ? '' : 'transition-[max-height,opacity] duration-300 ease-out'
            } ${menuOpen ? 'max-h-96 pt-4 opacity-100' : 'max-h-0 pt-0 opacity-0'}`}
          >
            {isAdmin ? (
              <>
                <Link href="/admin" className={LINK_CLASS}>
                  Home
                </Link>
                <a href="/" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  View site
                </a>
                <form action={logout}>
                  <button type="submit" className={LINK_CLASS}>
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.href)}
                    className={LINK_CLASS}
                  >
                    {link.label}
                  </a>
                ))}
                {/* The CTA is the one control on this bar — never teal text on navy for
                    a control, teal is 2.7:1 and a line/edge colour only. */}
                <a
                  href="#enquiry"
                  onClick={(e) => scrollToSection(e, '#enquiry')}
                  className="mt-2 shrink-0 rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy whitespace-nowrap transition-transform duration-150 active:scale-95 sm:mt-0"
                >
                  Request a quotation
                </a>
              </>
            )}
          </div>
        </nav>
      </header>
    </>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}
