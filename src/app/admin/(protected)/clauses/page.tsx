import { listClauses } from './actions'
import { ClauseForm } from './ClauseForm'
import { ClauseRow } from './ClauseRow'

function ClauseSection({
  title,
  description,
  kind,
  rows,
}: {
  title: string
  description: string
  kind: 'terms' | 'warranty'
  rows: Awaited<ReturnType<typeof listClauses>>
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-navy">{title}</h2>
        <p className="u-mono mt-1 text-sm text-navy/70">{description}</p>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="u-mono text-sm text-navy/70">No clauses yet.</p>}
        {rows.map((row, index) => (
          <ClauseRow key={row.id} clause={row} isFirst={index === 0} isLast={index === rows.length - 1} />
        ))}
      </div>

      <ClauseForm kind={kind} />
    </section>
  )
}

export default async function ClausesPage() {
  const [terms, warranty] = await Promise.all([listClauses('terms'), listClauses('warranty')])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl text-navy">Terms & warranty</h1>
        <p className="u-mono mt-1 text-navy/70">
          Reusable clauses offered on every quotation. Deactivating a clause removes it from the
          picker without erasing it from quotations that already used it.
        </p>
      </div>

      <ClauseSection
        title="Terms & conditions"
        description="Pre-selected on every new quotation, in this order."
        kind="terms"
        rows={terms}
      />

      <ClauseSection
        title="Warranty"
        description="Pre-selected on every new quotation, in this order."
        kind="warranty"
        rows={warranty}
      />
    </div>
  )
}
