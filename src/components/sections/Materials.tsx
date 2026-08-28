'use client'
import { motion } from 'framer-motion'
import type { ReactElement } from 'react'
import { MATERIAL_SPECS } from '@/data/specs'
import { isTBC } from '@/lib/tbc'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { MATERIAL_SPEC_ICONS, SpecIcon } from './MaterialsIcons'

export function Materials() {
  // D4: the client's rule is explicit — "if a figure is unknown, cut that row and run
  // three cuts", not render the label with nothing beneath it. Filter to known specs
  // before rendering anything, so the list itself disappears once none survive.
  const knownSpecs = MATERIAL_SPECS.filter((spec) => !isTBC(spec.value))

  return (
    <section id="materials" aria-labelledby="materials-heading" className="bg-navy py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* D2: text-paper carries display type on navy — pure white is not in the
            brand palette. */}
        <h2
          id="materials-heading"
          className="font-display text-4xl tracking-tight text-paper lg:text-5xl"
        >
          What it is made of
        </h2>
        <div className="mt-6 h-0.5 w-16 bg-teal" />

        {knownSpecs.length > 0 && (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {knownSpecs.map((spec, i) => {
              const Icon = MATERIAL_SPEC_ICONS[spec.label] ?? SpecIcon
              return (
                <SpecCard
                  key={`${spec.slot}-${spec.label}`}
                  index={i}
                  label={spec.label}
                  value={spec.value}
                  Icon={Icon}
                />
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function SpecCard({
  index,
  label,
  value,
  Icon,
}: {
  index: number
  label: string
  value: string
  Icon: (props: { className?: string }) => ReactElement
}) {
  const level = useMotionLevel()
  const reduced = level === 'reduced'
  // Same recipe as WeaveReveal (opacity + alternating x offset, settled on view),
  // duplicated rather than reused because WeaveReveal renders a div and this has to
  // stay a real <li> — D7's "no dead keyboard stops" rule already covers this file, so
  // the row must keep the plain list markup a div wrapper would break.
  const offset = level === 'mobile' ? 0 : index % 2 === 0 ? -32 : 32

  return (
    <motion.li
      initial={reduced ? undefined : { opacity: 0, x: offset }}
      whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.42, delay: index * 0.06, ease: [0.22, 1.2, 0.36, 1] }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      // Empty handler, not decoration: iOS Safari only matches `:active` on an element
      // that looks clickable to it, so without this the active: glow below never fires
      // on a touch tap, only on desktop's :hover.
      onClick={() => {}}
      // `whileTap` alone makes framer-motion inject tabIndex=0 on mount (it assumes
      // anything tappable should be keyboard-operable) — exactly the dead tab stop D7
      // already rules out for this row, so it has to be overridden explicitly.
      tabIndex={-1}
      className="group rounded-2xl border border-teal/20 bg-teal/5 p-6 transition-colors duration-300 hover:border-teal/50 active:border-teal/60 active:bg-teal/15"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-teal/40 text-sky transition-colors duration-300 group-hover:text-teal group-active:border-teal/70 group-active:text-teal">
        <Icon className="h-5 w-5" />
      </span>
      <p className="u-mono mt-4 text-sky">{label}</p>
      <p className="mt-2 font-display text-lg tracking-tight text-paper">{value}</p>
    </motion.li>
  )
}
