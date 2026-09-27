import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_KEYS,
  isExpenseCategory,
  type ExpenseCategory,
} from './categories'

/** One `group by category` row as the database returns it. */
export interface CategoryTotalRow {
  category: string
  totalCents: number
}

export interface CategoryTotal {
  category: ExpenseCategory
  label: string
  totalCents: number
}

/** Expands the database's sparse group-by result into the full, registry-ordered
 *  breakdown the page renders. Categories with no spend show as zero rather than
 *  disappearing — an absent row and a zero row mean the same thing to a reader, and
 *  a stable four-line block is easier to scan month over month than a shifting one. */
export function categoryBreakdown(rows: CategoryTotalRow[]): {
  perCategory: CategoryTotal[]
  totalCents: number
} {
  const sums = new Map<ExpenseCategory, number>()
  for (const row of rows) {
    if (!isExpenseCategory(row.category)) continue
    sums.set(row.category, (sums.get(row.category) ?? 0) + row.totalCents)
  }

  const perCategory = EXPENSE_CATEGORY_KEYS.map((category) => ({
    category,
    label: EXPENSE_CATEGORIES[category].label,
    totalCents: sums.get(category) ?? 0,
  }))

  return { perCategory, totalCents: perCategory.reduce((sum, c) => sum + c.totalCents, 0) }
}
