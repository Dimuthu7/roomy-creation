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

  return (
    <section ref={ref} className="bg-navy py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 lg:grid-cols-4">
        {ROWS.map(([key, label]) => (
          <Figure key={key} value={SITE.figures[key]} label={label} active={inView} />
        ))}
      </div>
    </section>
  )
}

function Figure({
  value,
  label,
  active,
}: {
  value: number | '[TBC]'
  label: string
  active: boolean
}) {
  const known = !isTBC(value)
  const count = useCountUp(known ? value : 0, active && known)
  return (
    <div>
      <p className="font-display text-5xl tracking-tight text-yellow lg:text-6xl">
        {known ? count : '—'}
      </p>
      <p className="u-mono mt-3 text-sky">{label}</p>
    </div>
  )
}
