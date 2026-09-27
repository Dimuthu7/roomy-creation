'use client'
import { useState } from 'react'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/expenses/categories'
import { formatCents } from '@/lib/money'
import { deleteExpense } from './actions'

export interface ExpenseRowData {
  id: string
  category: ExpenseCategory
  amountCents: number
  spentAt: string
  /** Already resolved by the page — the row does not read the details blob itself. */
  detail: string
}

/** Two-click confirm rather than window.confirm: the native dialog is blocked in some
 *  embedded contexts and cannot be asserted on in jsdom. */
export function ExpenseRow({ expense }: { expense: ExpenseRowData }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      data-testid="expense-row"
      className="flex flex-wrap items-center justify-between gap-4 border-2 border-navy p-4"
    >
      <div className="min-w-0 flex-1">
        <p className="u-mono text-xs text-navy/60">
          {expense.spentAt} · {EXPENSE_CATEGORIES[expense.category]?.label ?? expense.category}
        </p>
        <p className="mt-1 truncate text-sm text-navy">{expense.detail}</p>
      </div>

      <span className="font-display text-sm text-navy tabular-nums">{formatCents(expense.amountCents)}</span>

      {confirming ? (
        <div className="flex items-center gap-2">
          <form action={deleteExpense}>
            <input type="hidden" name="id" value={expense.id} />
            <AdminSubmitButton
              label="Delete"
              pendingLabel="Deleting"
              spinnerSize={12}
              className="rounded-full border border-navy bg-navy px-3 py-1.5 font-display text-xs text-paper transition duration-200 active:scale-95 disabled:opacity-60"
            />
          </form>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="u-mono text-xs text-navy underline underline-offset-4 hover:text-navy/70"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete expense ${expense.detail}`}
          className="rounded-full border border-navy px-3 py-1.5 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95"
        >
          ×
        </button>
      )}
    </div>
  )
}
