'use client'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { SITE } from '@/data/site'
import { isTBC } from '@/lib/tbc'
import { useCountUp } from '@/hooks/useCountUp'

const ROWS = [
  ['yearsInBusiness', 'Years in business'],
  ['homesFitted', 'Homes and apartments fitted'],
  ['unitsDelivered', 'Units delivered'],
  ['districtsCovered', 'Districts we install in'],
] as const

export function Figures() {
  const ref = useRef<HTMLElement>(null)
  // D9: under jsdom's stubbed IntersectionObserver this is true from the first render,
  // so it cannot be exercised as a scroll trigger in this suite — see Figures.test.tsx.
  const inView = useInView(ref, { once: true, amount: 0.4 })

  // F4: the client's rule is "if a figure is unknown, cut that row and run three
  // cuts" — Task 14 applied this to Materials (D4) but it was not carried across to
  // this section, so every SITE.figures value being [TBC] rendered four labels over
  // four em dashes directly beneath the hero. Cut to known figures first, and render
  // nothing at all once none survive.
  const knownRows = ROWS.filter(([key]) => !isTBC(SITE.figures[key]))
  if (knownRows.length === 0) return null

  return (
    <section ref={ref} aria-label="Figures" className="bg-navy py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 lg:grid-cols-4">
        {knownRows.map(([key, label]) => (
          <Figure key={key} value={SITE.figures[key] as number} label={label} active={inView} />
        ))}
      </div>
    </section>
  )
}

function Figure({ value, label, active }: { value: number; label: string; active: boolean }) {
  const count = useCountUp(value, active)
  return (
    <div>
      <p className="font-display text-5xl tracking-tight text-yellow lg:text-6xl">{count}</p>
      <p className="u-mono mt-3 text-sky">{label}</p>
    </div>
  )
}
