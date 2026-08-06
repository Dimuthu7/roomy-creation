import { WeaveReveal } from '@/components/weave/WeaveReveal'

// D8: the plan described this section only as "three short lines... what we make, who
// we make it for, and the fit argument" with no copy supplied. These three lines are
// the implementer's, flagged for client sign-off — see the Task 14 brief.
const LINES = [
  'We make built-in furniture for homes, apartments, hotels and offices.',
  'Every piece is measured on site before anything is cut.',
  'A standard-size unit leaves gaps. A fitted one does not.',
]

export function Position() {
  return (
    <section className="bg-navy py-32">
      <div className="mx-auto max-w-4xl space-y-10 px-6">
        {LINES.map((line, i) => (
          <WeaveReveal key={line} from={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.08}>
            {/* D2: text-paper carries display type on navy, never text-white. */}
            <p className="font-display text-3xl leading-snug tracking-tight text-paper sm:text-4xl lg:text-5xl">
              {line}
            </p>
          </WeaveReveal>
        ))}
      </div>
    </section>
  )
}
