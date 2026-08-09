import { Fragment } from 'react'
import { WeaveReveal } from '@/components/weave/WeaveReveal'
import { WeaveThreadNode } from '@/components/weave/WeaveThread'
import { WeaveTexture } from '@/components/weave/WeaveTexture'

// D8: the plan described this section only as "three short lines... what we make, who
// we make it for, and the fit argument" with no copy supplied. These three lines are
// NOT client-approved and are flagged for sign-off — see the Task 14 brief.
const LINES = [
  'We make built-in furniture for homes, apartments, hotels and offices.',
  'Every piece is measured on site before anything is cut.',
  'A standard-size unit leaves gaps. A fitted one does not.',
]

// Big → small → big: the opening claim and the closing contrast are the lines that
// earn display type; the process fact between them is supporting detail, so it steps
// down to body copy instead of shouting at the same volume as its neighbours. That
// step down also carries text-sky rather than text-paper — on solid navy (no photo
// overlay to dim it, unlike Hero) sky measures 7.8:1, well past the 4.5:1 AA floor,
// so the second line reads quieter without reading as low-contrast. Never text-white
// on either line.
const STYLES = [
  'font-display text-2xl font-medium leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl',
  'max-w-md font-body text-base leading-relaxed text-sky sm:text-lg',
  'font-display text-2xl font-semibold leading-snug tracking-tight text-paper sm:text-3xl lg:text-4xl',
]

const STAGGER = 0.3
const THREAD_GAP = '3rem'

export function Position() {
  return (
    <section aria-label="Position" className="relative overflow-hidden bg-navy py-28">
      <WeaveTexture />
      <div className="relative z-10 mx-auto grid max-w-4xl grid-cols-[1.25rem_1fr] gap-x-4 gap-y-12 px-6 sm:grid-cols-[2rem_1fr] sm:gap-x-8">
        {LINES.map((line, i) => {
          const delay = i * STAGGER
          return (
            <Fragment key={line}>
              <WeaveThreadNode delay={delay} hasNext={i < LINES.length - 1} gap={THREAD_GAP} />
              <WeaveReveal from={i % 2 === 0 ? 'left' : 'right'} delay={delay}>
                <p className={STYLES[i]}>{line}</p>
              </WeaveReveal>
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
