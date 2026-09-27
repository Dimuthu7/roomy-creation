'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_KEYS } from '@/lib/expenses/categories'
import { formatMonthLabel } from '@/lib/expenses/month'

const FIELD = 'border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs text-navy/70'

/** Filters live in the URL so the list, the breakdown and the pagination all stay
 *  plain server components and a filtered view survives a refresh and a share. Both
 *  values are held in local state seeded once from the URL, for the reason spelled
 *  out in JobFilters: router.replace() does not resolve synchronously, so reading
 *  useSearchParams() on each change would build the next URL from a stale snapshot.
 *
 *  `months` comes from the server so both sides agree on what "this month" is. */
export function ExpenseFilters({ months }: { months: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [month, setMonth] = useState(() => searchParams.get('month') ?? months[0] ?? '')
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '')

  function pushUrl(nextMonth: string, nextCategory: string) {
    const params = new URLSearchParams()
    if (nextMonth) params.set('month', nextMonth)
    if (nextCategory) params.set('category', nextCategory)
    // Deliberately drops `page`: page 3 of September is rarely page 3 of October, and
    // landing on an empty page after changing a filter reads as a bug.
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, { scroll: false })
  }

  return (
    <div className="grid grid-cols-1 gap-4 border border-navy/40 p-4 sm:grid-cols-2">
      <div>
        <label htmlFor="expense-filter-month" className={LABEL}>
          Month
        </label>
        <select
          id="expense-filter-month"
          data-testid="expense-filter-month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value)
            pushUrl(e.target.value, category)
          }}
          className={`${FIELD} mt-1 w-full`}
        >
          {months.map((value) => (
            <option key={value} value={value}>
              {formatMonthLabel(value)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="expense-filter-category" className={LABEL}>
          Category
        </label>
        <select
          id="expense-filter-category"
          data-testid="expense-filter-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            pushUrl(month, e.target.value)
          }}
          className={`${FIELD} mt-1 w-full`}
        >
          <option value="">All</option>
          {EXPENSE_CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>
              {EXPENSE_CATEGORIES[key].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
