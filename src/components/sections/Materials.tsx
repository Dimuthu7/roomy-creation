import { MATERIAL_SPECS } from '@/data/specs'
import { isTBC } from '@/lib/tbc'
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
            {knownSpecs.map((spec) => {
              const Icon = MATERIAL_SPEC_ICONS[spec.label] ?? SpecIcon
              return (
                <li
                  key={`${spec.slot}-${spec.label}`}
                  className="group border border-teal/20 bg-navy p-6 transition-colors duration-300 hover:border-teal/50"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-teal/40 text-sky transition-colors duration-300 group-hover:text-teal">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="u-mono mt-4 text-sky">{spec.label}</p>
                  <p className="mt-2 font-display text-lg tracking-tight text-paper">
                    {spec.value}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
