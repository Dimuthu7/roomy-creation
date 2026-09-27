import { formatCents } from '@/lib/money'
import type { CategoryTotal } from '@/lib/expenses/totals'

/** A server component: it holds no state and takes no interaction. */
export function ExpenseBreakdown({
  perCategory,
  totalCents,
  entryCount,
}: {
  perCategory: CategoryTotal[]
  totalCents: number
  entryCount: number
}) {
  return (
    <div className="border-2 border-navy p-4">
      <dl className="space-y-2">
        {perCategory.map((row) => (
          <div key={row.category} className="flex items-baseline justify-between gap-4">
            <dt className="u-mono text-sm text-navy/70">{row.label}</dt>
            <dd className="u-mono text-sm text-navy tabular-nums">{formatCents(row.totalCents)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex items-baseline justify-between gap-4 border-t-2 border-navy pt-3">
        <span className="font-display text-sm text-navy">
          Total
          <span className="u-mono ml-3 text-xs text-navy/60">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
        </span>
        <span data-testid="expense-total" className="font-display text-lg text-navy tabular-nums">
          {formatCents(totalCents)}
        </span>
      </div>
    </div>
  )
}
