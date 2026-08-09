import { Fragment } from 'react'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { WeaveThreadNode } from '@/components/weave/WeaveThread'
import { WeaveTexture } from '@/components/weave/WeaveTexture'

// D8: the plan described this section only as "three short lines... what we make, who
// we make it for, and the fit argument" with no copy supplied. Lines 1-3 are NOT
// client-approved and are flagged for sign-off — see the Task 14 brief. Lines 4-6 were
// added afterward as a second beat (durability, team continuity), same not-yet-approved
// status — see docs/superpowers/specs/2026-08-09-position-scroll-reveal-design.md.
const LINES = [
  'We make built-in furniture for homes, apartments, hotels and offices.',
  'Every piece is measured on site before anything is cut.',
  'A standard-size unit leaves gaps. A fitted one does not.',
  'Every material is chosen to last, not just to look good on day one.',
  'The same team measures, builds and installs — start to finish.',
  'Fit it once. It will not need fitting again.',
]

// Big → small → big, twice over: two "beats" of opening claim / supporting detail /
// closing contrast, each cycling through the same three styles via `i % 3` so the
// second beat (lines 4-6) reads with the same typographic rhythm as the first (lines
// 1-3) instead of needing new styles. (Entrance direction, via `i % 2`, keeps
// incrementing independently of that three-style cycle, so the two beats mirror each
// other left/right rather than repeating — a deliberate bit of variety, not the same
// rhythm end to end.) The opening claim and closing contrast earn display type; the
// supporting fact between them steps down to body copy instead of shouting at the same
// volume as its neighbours. That step down also carries text-sky rather than
// text-paper — on solid navy (no photo overlay to dim it, unlike Hero) sky measures
// 7.8:1, well past the 4.5:1 AA floor, so the supporting lines read quieter without
// reading as low-contrast. Never text-white on any line.
const STYLES = [
  'font-display text-2xl font-medium leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl',
  'max-w-md font-body text-base leading-relaxed text-sky sm:text-lg',
  'font-display text-2xl font-semibold leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl',
]

export function Position() {
  return (
    <section aria-label="Position" className="relative overflow-hidden bg-navy py-28">
      <WeaveTexture />
      <div className="relative z-10 mx-auto grid max-w-4xl grid-cols-[1.25rem_1fr] gap-x-4 gap-y-[var(--pos-gap)] px-6 [--pos-gap:85vh] sm:grid-cols-[2rem_1fr] sm:gap-x-8">
        {LINES.map((line, i) => (
          <Fragment key={line}>
            <WeaveThreadNode delay={0} hasNext={i < LINES.length - 1} gap="var(--pos-gap)" />
            <WeaveReveal from={i % 2 === 0 ? 'left' : 'right'} delay={0}>
              <p className={STYLES[i % 3]}>{line}</p>
            </WeaveReveal>
          </Fragment>
        ))}
      </div>
    </section>
  )
}
