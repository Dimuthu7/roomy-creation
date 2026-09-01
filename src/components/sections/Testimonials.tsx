'use client'
import { FacebookIcon } from '@/components/chrome/FooterIcons'
import { useSiteData } from '@/context/SiteData'
import type { Testimonial } from '@/data/testimonials'

// Tunable in one place: how long one full lap of the belt takes, scaled to how
// much there is to read. The floor keeps a 1-2 review site from whipping past at
// an unreadable speed rather than reading as "broken."
const SECONDS_PER_CARD = 6
const MIN_DURATION_S = 20

// Heading/subhead are the implementer's draft, not client-approved — flagged for
// sign-off the same way Position's statement lines are. No fabricated rating or
// review-count claim here (the reference design's "Rated 4/5 by 1 Lakh users"
// pill isn't something we have real data for).
const HEADING = 'What our customers say'
const SUBHEAD = 'Reviews from real customers, on Facebook and in person.'

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M9.5 6C6.5 7.5 5 10 5 13c0 2.2 1.6 3.8 3.6 3.8 1.8 0 3.2-1.3 3.2-3.1 0-1.6-1.1-2.8-2.6-3 .3-1.6 1.5-3 3-3.7L9.5 6Zm8 0c-3 1.5-4.5 4-4.5 7 0 2.2 1.6 3.8 3.6 3.8 1.8 0 3.2-1.3 3.2-3.1 0-1.6-1.1-2.8-2.6-3 .3-1.6 1.5-3 3-3.7L17.5 6Z" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 19.5c1.4-3.6 4.3-5.3 7.5-5.3s6.1 1.7 7.5 5.3" />
    </svg>
  )
}

function Avatar({ testimonial }: { testimonial: Testimonial }) {
  if (testimonial.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- per-reviewer Facebook CDN URL, not a static asset next/image's remote-pattern allowlist fits
      <img
        src={testimonial.avatarUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy/40">
      <UserIcon className="h-6 w-6" />
    </span>
  )
}

function TestimonialMeta({ testimonial }: { testimonial: Testimonial }) {
  if (testimonial.source === 'facebook' && testimonial.recommended) {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-navy/60">
        <FacebookIcon className="h-3.5 w-3.5" />
        Recommends on Facebook
      </span>
    )
  }
  if (testimonial.rating != null) {
    return (
      <span
        className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-yellow"
        aria-label={`${testimonial.rating} out of 5 stars`}
      >
        {'★'.repeat(testimonial.rating)}
        {'☆'.repeat(5 - testimonial.rating)}
      </span>
    )
  }
  return null
}

function TestimonialCard({ testimonial, duplicate }: { testimonial: Testimonial; duplicate?: boolean }) {
  return (
    <div
      data-testid={duplicate ? 'testimonial-card-duplicate' : 'testimonial-card'}
      role="group"
      aria-label={duplicate ? undefined : `Review from ${testimonial.authorName}`}
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : 0}
      className="w-80 shrink-0 rounded-2xl border border-navy/10 bg-white p-6 shadow-sm"
    >
      <QuoteIcon className="h-6 w-6 text-yellow" />
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-navy/90">{testimonial.reviewText}</p>
      <div className="mt-5 flex items-center gap-3">
        <Avatar testimonial={testimonial} />
        <div className="min-w-0">
          <p className="truncate font-display text-sm text-navy">{testimonial.authorName}</p>
          <TestimonialMeta testimonial={testimonial} />
        </div>
      </div>
    </div>
  )
}

/** Continuously auto-scrolls, pausing on hover or keyboard focus — see the CSS
 *  keyframe's comment in globals.css for why this is a CSS animation rather than a
 *  framer-motion one. Renders nothing once there are no curated-visible
 *  testimonials, matching Position's "cut what's unknown" rule for its stats. */
export function Testimonials() {
  const { testimonials } = useSiteData()
  if (testimonials.length === 0) return null

  const duration = Math.max(MIN_DURATION_S, testimonials.length * SECONDS_PER_CARD)

  return (
    <section id="testimonials" aria-label="Testimonials" className="on-paper relative bg-paper py-24 text-navy">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{HEADING}</h2>
        <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-navy/70">{SUBHEAD}</p>
      </div>

      <div className="testimonial-fade-mask relative mt-10 overflow-hidden">
        <div
          className="animate-testimonial-marquee flex w-max gap-6 px-6"
          style={{ animationDuration: `${duration}s` }}
        >
          {testimonials.map((t) => (
            <TestimonialCard key={`real-${t.id}`} testimonial={t} />
          ))}
          {testimonials.map((t) => (
            <TestimonialCard key={`dup-${t.id}`} testimonial={t} duplicate />
          ))}
        </div>
      </div>
    </section>
  )
}
