import {
  EXPENSE_CATEGORIES,
  isExpenseCategory,
  type ExpenseCategory,
} from '@/lib/expenses/categories'
import { currentMonth, formatMonthLabel, recentMonths } from '@/lib/expenses/month'
import { listExpenses, listShops, monthCategoryTotals } from '@/lib/expenses/queries'
import { categoryBreakdown } from '@/lib/expenses/totals'
import { ExpenseBreakdown } from './ExpenseBreakdown'
import { ExpenseFilters } from './ExpenseFilters'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseRow } from './ExpenseRow'
import { ExpensesPagination } from './ExpensesPagination'

/** Two years of months in the filter. Long enough to look back over a full year of
 *  trading, short enough that the dropdown stays scannable. */
const MONTH_WINDOW = 24

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; page?: string }>
}) {
  const params = await searchParams

  // `now` is captured once and threaded through, so the month list, the default month
  // and the form's default date cannot disagree if the request straddles midnight.
  const now = new Date()
  const month = params.month ?? currentMonth(now)
  const category = isExpenseCategory(params.category) ? params.category : undefined
  const page = params.page ? Number(params.page) : 1
  const filters = { month, category, page }

  const [{ rows, totalPages, total }, totalRows, shops] = await Promise.all([
    listExpenses(filters),
    monthCategoryTotals({ month, category }),
    listShops(),
  ])

  const { perCategory, totalCents } = categoryBreakdown(totalRows)

  // The shop name is resolved here rather than joined in SQL: `details` holds only an
  // id, the shops table is small enough to read whole, and a join on a JSONB path
  // would be markedly more fragile than a lookup.
  const shopNames = new Map(shops.map((shop) => [shop.id, shop.name]))

  const listRows = rows.map((row) => {
    const details = (row.details ?? {}) as Record<string, unknown>
    const shopId = typeof details.shopId === 'string' ? details.shopId : null
    const def = EXPENSE_CATEGORIES[row.category as ExpenseCategory]
    return {
      id: row.id,
      category: row.category as ExpenseCategory,
      amountCents: row.amountCents,
      spentAt: row.spentAt,
      detail:
        def?.summary({
          details,
          remark: row.remark,
          shopName: shopId ? (shopNames.get(shopId) ?? null) : null,
        }) ?? row.category,
    }
  })

  const today = now.toISOString().slice(0, 10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-navy">Expenses</h1>
        <p className="u-mono mt-1 text-navy/70">Record what the business spends, by category.</p>
      </div>

      <ExpenseForm shops={shops} today={today} />

      <ExpenseFilters months={recentMonths(MONTH_WINDOW, now)} />

      <ExpenseBreakdown perCategory={perCategory} totalCents={totalCents} entryCount={total} />

      <div className="space-y-3">
        {listRows.length === 0 && (
          <p className="u-mono text-sm text-navy/70">No expenses in {formatMonthLabel(month)}.</p>
        )}
        {listRows.map((row) => (
          <ExpenseRow key={row.id} expense={row} />
        ))}
      </div>

      <ExpensesPagination page={page} totalPages={totalPages} searchParams={{ month, category }} />
    </div>
  )
}
