import { MATERIAL_SPECS } from '@/data/specs'
import { isTBC } from '@/lib/tbc'

// The client approved these four lines verbatim. The melamine argument is confident
// and factual — it never apologises for engineered board or hedges it against solid
// timber, so no register check here should ever need to soften it.
const BOARD_ARGUMENT = [
  'Engineered board is wood fibre pressed with resin into a panel of consistent density, then faced with melamine.',
  'It does not have a grain direction, so a tall door stays flat where a solid timber one cups.',
  'Sri Lankan humidity swings year round. Solid wood moves with it. A sealed, edge-banded panel does not.',
  'Where there is water, under sinks and along a kitchen run, we use moisture-resistant board rather than standard board.',
]

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

        {knownSpecs.length > 0 && (
          <ul className="mt-12 grid gap-px bg-teal/30 md:grid-cols-3">
            {knownSpecs.map((spec) => (
              <li key={`${spec.slot}-${spec.label}`} className="bg-navy p-6">
                <p className="u-mono text-sky">{spec.label}</p>
                <p className="mt-2 text-paper">{spec.value}</p>
              </li>
            ))}
          </ul>
        )}

        <div data-testid="board-argument" className="mt-12 max-w-2xl space-y-4">
          {BOARD_ARGUMENT.map((line) => (
            <p key={line} className="text-sky">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
