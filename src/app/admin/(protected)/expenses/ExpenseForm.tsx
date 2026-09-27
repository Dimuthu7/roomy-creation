'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_KEYS,
  type ExpenseCategory,
  type ExpenseField,
} from '@/lib/expenses/categories'
import { addExpense, NEW_SHOP_VALUE, type ActionState } from './actions'

const initialState: ActionState = {}
const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'
const HINT = 'u-mono mt-1 block text-xs text-navy/60'

export interface ShopOption {
  id: string
  name: string
}

/** `today` is passed in from the server page rather than computed here: computing it
 *  in the component would render a different default date on the server than on the
 *  client whenever the two disagree about the date, which is a hydration mismatch. */
export function ExpenseForm({ shops, today }: { shops: ShopOption[]; today: string }) {
  const [category, setCategory] = useState<ExpenseCategory>('material')
  const [shopChoice, setShopChoice] = useState('')
  const [state, formAction, pending] = useActionState(addExpense, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      toast.success('Expense saved.')
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  function renderField(field: ExpenseField) {
    const id = `expense-${field.name}`
    // The "(optional)" marker is a SIBLING of the <label>, not a child of it: putting it
    // inside the label would change the field's accessible name to e.g. "Discount
    // (optional)", breaking getByLabelText('Discount') and friends.
    const label = <label htmlFor={id} className={LABEL}>{field.label}</label>
    const optionalHint = !field.required && <span className="text-navy/50 text-xs"> (optional)</span>
    const hint = field.hint ? <span className={HINT}>{field.hint}</span> : null

    switch (field.kind) {
      case 'textarea':
        return (
          <div key={field.name}>
            {label}
            {optionalHint}
            <textarea id={id} name={field.name} rows={2} required={field.required} className={FIELD} />
            {hint}
          </div>
        )

      case 'date':
        return (
          <div key={field.name}>
            {label}
            <input
              id={id}
              type="date"
              name={field.name}
              required={field.required}
              defaultValue={today}
              className={FIELD}
            />
            {hint}
          </div>
        )

      case 'money':
        return (
          <div key={field.name}>
            {label}
            {optionalHint}
            {/* Text, not number: the admin types grouped amounts like "45,000.00",
                which a number input silently refuses. parseMoneyToCents handles both. */}
            <input
              id={id}
              type="text"
              inputMode="decimal"
              name={field.name}
              required={field.required}
              placeholder="0.00"
              className={FIELD}
            />
            {hint}
          </div>
        )

      case 'radio':
        return (
          <fieldset key={field.name}>
            <legend className={LABEL}>{field.label}</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {field.options.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    defaultChecked={option.value === field.defaultValue}
                    className="size-4 accent-navy"
                  />
                  <span className="u-mono text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {hint}
          </fieldset>
        )

      case 'select':
        return (
          <div key={field.name}>
            {label}
            {optionalHint}
            <select id={id} name={field.name} required={field.required} defaultValue="" className={FIELD}>
              <option value="" disabled>
                Choose…
              </option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hint}
          </div>
        )

      case 'shop':
        return (
          <div key={field.name}>
            {label}
            {optionalHint}
            <select
              id={id}
              name={field.name}
              required={field.required}
              value={shopChoice}
              onChange={(e) => setShopChoice(e.target.value)}
              className={FIELD}
            >
              <option value="" disabled>
                Choose…
              </option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
              <option value={NEW_SHOP_VALUE}>+ Add new shop…</option>
            </select>
            {shopChoice === NEW_SHOP_VALUE && (
              <div className="mt-2">
                <label htmlFor="expense-newShopName" className={LABEL}>
                  New shop name
                </label>
                <input id="expense-newShopName" type="text" name="newShopName" required className={FIELD} />
              </div>
            )}
            {hint}
          </div>
        )

      case 'text':
      default:
        return (
          <div key={field.name}>
            {label}
            {optionalHint}
            <input id={id} type="text" name={field.name} required={field.required} className={FIELD} />
            {hint}
          </div>
        )
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onReset={() => setShopChoice('')}
      className="space-y-4 border-2 border-navy p-4"
    >
      <h2 className="font-display text-lg text-navy">Add an expense</h2>

      <div className="flex flex-wrap gap-2">
        {EXPENSE_CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === category}
            onClick={() => {
              setCategory(key)
              setShopChoice('')
            }}
            className={`rounded-full border-2 border-navy px-4 py-1.5 font-display text-xs transition duration-200 active:scale-95 ${
              key === category ? 'bg-navy text-paper' : 'text-navy hover:bg-navy/10'
            }`}
          >
            {EXPENSE_CATEGORIES[key].label}
          </button>
        ))}
      </div>

      <input type="hidden" name="category" value={category} data-testid="expense-category" />

      {/* Keyed on the category so switching tears the old inputs down rather than
          reusing them — otherwise React keeps the DOM node for two fields that share
          a position, and a price typed under Material would reappear as a salary. */}
      <div key={category} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {EXPENSE_CATEGORIES[category].fields.map(renderField)}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      >
        <SubmitButtonLabel pending={pending} label="Save expense" pendingLabel="Saving" spinnerSize={14} />
      </button>
    </form>
  )
}
