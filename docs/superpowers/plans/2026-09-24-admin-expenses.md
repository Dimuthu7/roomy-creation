# Admin Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/admin/expenses` section where the business records what it spends, in four code-defined categories, and reads back a monthly per-category breakdown.

**Architecture:** One `expenses` table carries the fields every category shares — category, net amount in cents, date, remark — with per-category fields in a JSONB `details` column. A registry in `src/lib/expenses/categories.ts` describes each category as a list of field descriptors; the form renders from those descriptors and the list renders each category's own summary line, so adding a fifth category is one registry entry and no migration. A second table, `shops`, backs Material's user-extensible Shop dropdown.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19 (`useActionState`), Drizzle ORM + Postgres (Neon), Zod v4, Tailwind v4, vitest + Testing Library, sonner for toasts.

**Spec:** `docs/superpowers/specs/2026-09-24-admin-expenses-design.md`

## Global Constraints

- **Money is always integer cents.** Parse admin input with `parseMoneyToCents` from `@/lib/money`, render with `formatCents`. Never use floats for money.
- **`expenses.amount_cents` always holds the NET cost.** Material's is price − discount; the other three are their single money field. Nothing downstream may recompute it per category.
- **Category keys are exactly:** `material`, `salary`, `business_capital`, `transport`.
- **Employee type values are exactly:** `part_time`, `permanent`. Default `part_time`.
- **Business Capital type values are exactly:** `workshop_cost`, `vehicle_cost`, `tools`, `repair`, `other`.
- **Discount exceeding price is rejected** with the exact message `Discount cannot be more than the price.`
- **Month values are `'YYYY-MM'` strings**; date values are `'YYYY-MM-DD'` strings. Both compare lexicographically, which is why `listJobs` already treats date bounds as plain strings.
- **Every server action calls `await verifyAdminSession()` first**, before reading any input.
- **Validation errors surface as `ActionState.error`** (first Zod issue message), matching `src/app/admin/(protected)/clauses/actions.ts`.
- **Page size is 10**, matching the quotations list.
- **Out of scope, do not build:** editing existing rows, job linkage, stock quantities, CSV export, charts, a category-management UI.
- Run `npm test` (vitest) and `npm run lint` before each commit.

---

### Task 1: Month helpers

Pure date-string helpers, no dependencies. Everything else that deals with a month imports these.

**Files:**
- Create: `src/lib/expenses/month.ts`
- Test: `src/lib/expenses/month.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `currentMonth(now?: Date): string` — `'2026-09'`
  - `parseMonth(month: string): { year: number; month: number } | null`
  - `monthRange(month: string): { start: string; end: string } | null` — inclusive `'YYYY-MM-DD'` bounds
  - `formatMonthLabel(month: string): string` — `'September 2026'`, or the input unchanged if unparseable
  - `recentMonths(count: number, now?: Date): string[]` — newest first

- [ ] **Step 1: Write the failing test**

Create `src/lib/expenses/month.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { currentMonth, formatMonthLabel, monthRange, parseMonth, recentMonths } from './month'

describe('currentMonth', () => {
  it('formats as YYYY-MM with a padded month', () => {
    expect(currentMonth(new Date(2026, 8, 24))).toBe('2026-09')
  })

  it('pads a single-digit month', () => {
    expect(currentMonth(new Date(2026, 0, 5))).toBe('2026-01')
  })
})

describe('parseMonth', () => {
  it('parses a well-formed month', () => {
    expect(parseMonth('2026-09')).toEqual({ year: 2026, month: 9 })
  })

  it('returns null for a month outside 1-12', () => {
    expect(parseMonth('2026-13')).toBeNull()
    expect(parseMonth('2026-00')).toBeNull()
  })

  it('returns null for anything not YYYY-MM', () => {
    expect(parseMonth('2026-9')).toBeNull()
    expect(parseMonth('2026-09-01')).toBeNull()
    expect(parseMonth('')).toBeNull()
    expect(parseMonth('nonsense')).toBeNull()
  })
})

describe('monthRange', () => {
  it('spans a 30-day month', () => {
    expect(monthRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
  })

  it('spans a 31-day month', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' })
  })

  it('handles February in a leap year', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
  })

  it('handles February in a non-leap year', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('returns null for an unparseable month', () => {
    expect(monthRange('2026-13')).toBeNull()
  })
})

describe('formatMonthLabel', () => {
  it('names the month', () => {
    expect(formatMonthLabel('2026-09')).toBe('September 2026')
  })

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(formatMonthLabel('whenever')).toBe('whenever')
  })
})

describe('recentMonths', () => {
  it('lists months newest first', () => {
    expect(recentMonths(3, new Date(2026, 8, 24))).toEqual(['2026-09', '2026-08', '2026-07'])
  })

  it('rolls back across a year boundary', () => {
    expect(recentMonths(3, new Date(2026, 0, 15))).toEqual(['2026-01', '2025-12', '2025-11'])
  })

  it('returns an empty list for a count of zero', () => {
    expect(recentMonths(0, new Date(2026, 8, 24))).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/expenses/month.test.ts`
Expected: FAIL — `Failed to resolve import "./month"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/expenses/month.ts`:

```ts
// A month is a 'YYYY-MM' string and a date is a 'YYYY-MM-DD' string, for the same
// reason listJobs compares date bounds as plain strings: in those formats
// lexicographic order IS chronological order, so no Date object is needed to filter,
// sort or compare. Date objects appear here only to ask the calendar how long a month
// is, and always in UTC so a machine in any timezone computes the same boundaries.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
}

export function parseMonth(month: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return null
  const year = Number(match[1])
  const monthNumber = Number(match[2])
  if (monthNumber < 1 || monthNumber > 12) return null
  return { year, month: monthNumber }
}

/** Inclusive bounds, so a query uses gte(start) and lte(end) — matching how
 *  listJobs treats its `from`/`to` filters. */
export function monthRange(month: string): { start: string; end: string } | null {
  const parsed = parseMonth(month)
  if (!parsed) return null
  // Day 0 of the FOLLOWING month is the last day of this one — the standard trick,
  // and the only leap-year rule that is never wrong.
  const lastDay = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate()
  const prefix = `${parsed.year}-${pad2(parsed.month)}`
  return { start: `${prefix}-01`, end: `${prefix}-${pad2(lastDay)}` }
}

export function formatMonthLabel(month: string): string {
  const parsed = parseMonth(month)
  if (!parsed) return month
  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`
}

/** Newest first. Used to populate the month filter without querying the table for
 *  which months actually have rows — a fixed recent window is enough and costs
 *  nothing. */
export function recentMonths(count: number, now: Date = new Date()): string[] {
  const months: string[] = []
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  for (let i = 0; i < count; i++) {
    months.push(`${year}-${pad2(month)}`)
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return months
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/expenses/month.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expenses/month.ts src/lib/expenses/month.test.ts
git commit -m "feat: add month helpers for the expenses section"
```

---

### Task 2: The category registry

The file a future category is added to. It describes each category's fields and its one-line list summary; it holds no validation and no database access.

**Files:**
- Create: `src/lib/expenses/categories.ts`
- Test: `src/lib/expenses/categories.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `EXPENSE_CATEGORY_KEYS: readonly ['material','salary','business_capital','transport']`
  - `type ExpenseCategory = (typeof EXPENSE_CATEGORY_KEYS)[number]`
  - `isExpenseCategory(value: unknown): value is ExpenseCategory`
  - `type ExpenseFieldKind = 'text'|'textarea'|'money'|'date'|'radio'|'select'|'shop'`
  - `type ExpenseField` — discriminated on `kind`, every variant has `name`, `label`, `required`
  - `interface ExpenseSummaryInput { details: Record<string, unknown>; remark: string | null; shopName: string | null }`
  - `interface ExpenseCategoryDef { key; label; fields: ExpenseField[]; summary(input: ExpenseSummaryInput): string }`
  - `EXPENSE_CATEGORIES: Record<ExpenseCategory, ExpenseCategoryDef>`
  - `EMPLOYEE_TYPES`, `EMPLOYEE_TYPE_LABELS`, `CAPITAL_KINDS`, `CAPITAL_KIND_LABELS`

- [ ] **Step 1: Write the failing test**

Create `src/lib/expenses/categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_KEYS,
  isExpenseCategory,
  type ExpenseFieldKind,
} from './categories'

const KNOWN_KINDS: ExpenseFieldKind[] = ['text', 'textarea', 'money', 'date', 'radio', 'select', 'shop']

describe('the registry', () => {
  it('has an entry for every key, keyed consistently', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      expect(EXPENSE_CATEGORIES[key].key).toBe(key)
    }
    expect(Object.keys(EXPENSE_CATEGORIES).sort()).toEqual([...EXPENSE_CATEGORY_KEYS].sort())
  })

  // This is the guard that a half-added future category fails a test rather than
  // crashing the form in production.
  it('gives every category a label, fields and a summary', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      const def = EXPENSE_CATEGORIES[key]
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.fields.length).toBeGreaterThan(0)
      expect(typeof def.summary).toBe('function')
    }
  })

  it('uses only field kinds the form knows how to render', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      for (const field of EXPENSE_CATEGORIES[key].fields) {
        expect(KNOWN_KINDS).toContain(field.kind)
      }
    }
  })

  it('gives every field a unique name within its category', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      const names = EXPENSE_CATEGORIES[key].fields.map((f) => f.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('gives every category a date field named spentAt and a remark field', () => {
    for (const key of EXPENSE_CATEGORY_KEYS) {
      const fields = EXPENSE_CATEGORIES[key].fields
      expect(fields.some((f) => f.name === 'spentAt' && f.kind === 'date')).toBe(true)
      expect(fields.some((f) => f.name === 'remark')).toBe(true)
    }
  })

  it('has exactly one money field per category except material, which has two', () => {
    const moneyCount = (key: (typeof EXPENSE_CATEGORY_KEYS)[number]) =>
      EXPENSE_CATEGORIES[key].fields.filter((f) => f.kind === 'money').length
    expect(moneyCount('material')).toBe(2)
    expect(moneyCount('salary')).toBe(1)
    expect(moneyCount('business_capital')).toBe(1)
    expect(moneyCount('transport')).toBe(1)
  })
})

describe('isExpenseCategory', () => {
  it('accepts a known key', () => {
    expect(isExpenseCategory('material')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isExpenseCategory('materials')).toBe(false)
    expect(isExpenseCategory('')).toBe(false)
    expect(isExpenseCategory(undefined)).toBe(false)
    expect(isExpenseCategory(7)).toBe(false)
  })
})

describe('summaries', () => {
  const blank = { remark: null, shopName: null }

  it('shows a material as name then shop', () => {
    expect(
      EXPENSE_CATEGORIES.material.summary({
        ...blank,
        details: { name: '18mm MDF board' },
        shopName: 'Ajith Hardware',
      }),
    ).toBe('18mm MDF board · Ajith Hardware')
  })

  it('shows a material without its shop when the shop is gone', () => {
    expect(
      EXPENSE_CATEGORIES.material.summary({ ...blank, details: { name: '18mm MDF board' } }),
    ).toBe('18mm MDF board')
  })

  it('shows a salary as employee then type', () => {
    expect(
      EXPENSE_CATEGORIES.salary.summary({
        ...blank,
        details: { employeeName: 'Sunil', employeeType: 'part_time' },
      }),
    ).toBe('Sunil · Part time')
  })

  it('shows only the type when no employee name was given', () => {
    expect(
      EXPENSE_CATEGORIES.salary.summary({ ...blank, details: { employeeType: 'permanent' } }),
    ).toBe('Permanent')
  })

  it('shows business capital as its type label', () => {
    expect(
      EXPENSE_CATEGORIES.business_capital.summary({ ...blank, details: { kind: 'workshop_cost' } }),
    ).toBe('Workshop cost')
  })

  it('falls back when business capital carries an unrecognised type', () => {
    expect(
      EXPENSE_CATEGORIES.business_capital.summary({ ...blank, details: { kind: 'nope' } }),
    ).toBe('Business capital')
  })

  it('shows transport as its remark', () => {
    expect(
      EXPENSE_CATEGORIES.transport.summary({ details: {}, remark: 'Lorry to Kurunegala', shopName: null }),
    ).toBe('Lorry to Kurunegala')
  })

  it('falls back when transport has no remark', () => {
    expect(EXPENSE_CATEGORIES.transport.summary({ details: {}, remark: '  ', shopName: null })).toBe('Transport')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/expenses/categories.test.ts`
Expected: FAIL — `Failed to resolve import "./categories"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/expenses/categories.ts`:

```ts
// The registry. Adding a category means adding one entry here and one Zod schema in
// ./schema.ts — the form, the list, the filters and the breakdown all follow, and no
// migration is needed because the per-category fields live in the expenses.details
// JSONB column.
//
// This file holds no validation and touches no database: it describes what a category
// looks like. Validation is ./schema.ts, persistence is ./queries.ts.

export const EXPENSE_CATEGORY_KEYS = ['material', 'salary', 'business_capital', 'transport'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORY_KEYS)[number]

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (EXPENSE_CATEGORY_KEYS as readonly string[]).includes(value)
}

export const EMPLOYEE_TYPES = ['part_time', 'permanent'] as const
export type EmployeeType = (typeof EMPLOYEE_TYPES)[number]
export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  part_time: 'Part time',
  permanent: 'Permanent',
}

export const CAPITAL_KINDS = ['workshop_cost', 'vehicle_cost', 'tools', 'repair', 'other'] as const
export type CapitalKind = (typeof CAPITAL_KINDS)[number]
export const CAPITAL_KIND_LABELS: Record<CapitalKind, string> = {
  workshop_cost: 'Workshop cost',
  vehicle_cost: 'Vehicle cost',
  tools: 'Tools',
  repair: 'Repair',
  other: 'Other',
}

export type ExpenseFieldKind = 'text' | 'textarea' | 'money' | 'date' | 'radio' | 'select' | 'shop'

interface FieldBase {
  name: string
  label: string
  required: boolean
  /** Shown under the input. Optional — most fields need no explanation. */
  hint?: string
}

interface Choice {
  value: string
  label: string
}

export type ExpenseField =
  | (FieldBase & { kind: 'text' })
  | (FieldBase & { kind: 'textarea' })
  | (FieldBase & { kind: 'money' })
  | (FieldBase & { kind: 'date' })
  | (FieldBase & { kind: 'radio'; options: Choice[]; defaultValue: string })
  | (FieldBase & { kind: 'select'; options: Choice[] })
  | (FieldBase & { kind: 'shop' })

/** What the list row hands a category so it can describe itself. `shopName` is
 *  resolved by the page from the shops list — `details` only ever holds a shop id. */
export interface ExpenseSummaryInput {
  details: Record<string, unknown>
  remark: string | null
  shopName: string | null
}

export interface ExpenseCategoryDef {
  key: ExpenseCategory
  label: string
  fields: ExpenseField[]
  /** The DETAIL column's one line. Never throws: it renders historical rows whose
   *  details blob predates any later change to this category's fields. */
  summary(input: ExpenseSummaryInput): string
}

function str(details: Record<string, unknown>, key: string): string {
  const value = details[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Joins the parts that are actually present, so a missing optional never leaves a
 *  dangling separator. */
function join(...parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ')
}

const dateField: ExpenseField = { kind: 'date', name: 'spentAt', label: 'Date', required: true }
const remarkField: ExpenseField = { kind: 'text', name: 'remark', label: 'Remark', required: false }

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, ExpenseCategoryDef> = {
  material: {
    key: 'material',
    label: 'Material',
    fields: [
      { kind: 'text', name: 'name', label: 'Name', required: true },
      { kind: 'textarea', name: 'description', label: 'Description', required: false },
      { kind: 'money', name: 'price', label: 'Price', required: true },
      { kind: 'money', name: 'discount', label: 'Discount', required: false, hint: 'An amount off, not a percentage. Leave blank for none.' },
      { kind: 'shop', name: 'shopId', label: 'Shop', required: true },
      dateField,
      remarkField,
    ],
    summary: ({ details, shopName }) => join(str(details, 'name'), shopName) || 'Material',
  },

  salary: {
    key: 'salary',
    label: 'Salaries',
    fields: [
      {
        kind: 'radio',
        name: 'employeeType',
        label: 'Employee type',
        required: true,
        defaultValue: 'part_time',
        options: EMPLOYEE_TYPES.map((value) => ({ value, label: EMPLOYEE_TYPE_LABELS[value] })),
      },
      { kind: 'text', name: 'employeeName', label: 'Employee name', required: false },
      { kind: 'money', name: 'salary', label: 'Salary', required: true },
      dateField,
      remarkField,
    ],
    summary: ({ details }) => {
      const type = str(details, 'employeeType')
      const typeLabel = EMPLOYEE_TYPE_LABELS[type as EmployeeType] ?? ''
      return join(str(details, 'employeeName'), typeLabel) || 'Salary'
    },
  },

  business_capital: {
    key: 'business_capital',
    label: 'Business Capital',
    fields: [
      {
        kind: 'select',
        name: 'kind',
        label: 'Type',
        required: true,
        options: CAPITAL_KINDS.map((value) => ({ value, label: CAPITAL_KIND_LABELS[value] })),
      },
      { kind: 'money', name: 'amount', label: 'Amount', required: true },
      dateField,
      remarkField,
    ],
    summary: ({ details }) =>
      CAPITAL_KIND_LABELS[str(details, 'kind') as CapitalKind] ?? 'Business capital',
  },

  transport: {
    key: 'transport',
    label: 'Transport',
    fields: [
      { kind: 'money', name: 'amount', label: 'Price', required: true },
      dateField,
      remarkField,
    ],
    summary: ({ remark }) => remark?.trim() || 'Transport',
  },
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/expenses/categories.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expenses/categories.ts src/lib/expenses/categories.test.ts
git commit -m "feat: add the expense category registry"
```

---

### Task 3: Validation schemas

Zod per category, turning raw FormData into the row shape. Starts by extracting the two money-field helpers that `src/lib/jobs/schema.ts` currently keeps private, so both domains share one definition rather than growing a second copy.

**Files:**
- Create: `src/lib/moneyFields.ts`
- Modify: `src/lib/jobs/schema.ts` (delete the two local helpers, import them instead)
- Create: `src/lib/expenses/schema.ts`
- Test: `src/lib/expenses/schema.test.ts`

**Interfaces:**
- Consumes: `parseMoneyToCents` from `@/lib/money`; `CAPITAL_KINDS`, `EMPLOYEE_TYPES`, `isExpenseCategory`, `type ExpenseCategory` from `./categories`.
- Produces:
  - From `@/lib/moneyFields`: `requiredMoney(message: string)`, `optionalMoney(message: string)`
  - `interface ParsedExpense { category: ExpenseCategory; amountCents: number; spentAt: string; remark: string | null; details: Record<string, unknown> }`
  - `parseExpenseForm(category: unknown, raw: Record<string, unknown>): { ok: true; value: ParsedExpense } | { ok: false; error: string }`

- [ ] **Step 1: Extract the money-field helpers**

Create `src/lib/moneyFields.ts`:

```ts
import { z } from 'zod'
import { parseMoneyToCents } from '@/lib/money'

/** A money field that must be present. Shared by the quotation forms and the
 *  expenses form — one definition, so "45,000.00" is accepted identically in both. */
export function requiredMoney(message: string) {
  return z.string().transform((v, ctx) => {
    const cents = parseMoneyToCents(v)
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return cents
  })
}

/** A money field where blank means zero — discounts and delivery charges usually are. */
export function optionalMoney(message: string) {
  return z
    .string()
    .default('')
    .transform((v, ctx) => {
      if (v.trim() === '') return 0
      const cents = parseMoneyToCents(v)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return cents
    })
}
```

Then in `src/lib/jobs/schema.ts`: delete the local `requiredMoney` and `optionalMoney` function declarations (and the now-unused `parseMoneyToCents` import, if nothing else in that file uses it) and add near the top:

```ts
import { optionalMoney, requiredMoney } from '@/lib/moneyFields'
```

- [ ] **Step 2: Run the existing suite to prove the extraction changed nothing**

Run: `npm test`
Expected: PASS — the same test count as before the extraction, with `src/lib/jobs/schema.test.ts` green.

- [ ] **Step 3: Commit the extraction on its own**

```bash
git add src/lib/moneyFields.ts src/lib/jobs/schema.ts
git commit -m "refactor: share the money field helpers between jobs and expenses"
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/expenses/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseExpenseForm } from './schema'

function material(overrides: Record<string, unknown> = {}) {
  return {
    name: '18mm MDF board',
    description: '8 sheets',
    price: '50,000.00',
    discount: '2,500.00',
    shopId: 'shop-1',
    spentAt: '2026-09-24',
    remark: 'For RC194',
    ...overrides,
  }
}

function expectOk(result: ReturnType<typeof parseExpenseForm>) {
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`)
  return result.value
}

function expectError(result: ReturnType<typeof parseExpenseForm>) {
  if (result.ok) throw new Error('expected a validation failure')
  return result.error
}

describe('material', () => {
  it('nets the discount off the price', () => {
    const value = expectOk(parseExpenseForm('material', material()))
    expect(value.amountCents).toBe(4_750_000)
  })

  it('keeps the gross price and the discount in details', () => {
    const value = expectOk(parseExpenseForm('material', material()))
    expect(value.details).toEqual({
      name: '18mm MDF board',
      description: '8 sheets',
      priceCents: 5_000_000,
      discountCents: 250_000,
      shopId: 'shop-1',
    })
  })

  it('carries the shared fields through', () => {
    const value = expectOk(parseExpenseForm('material', material()))
    expect(value.category).toBe('material')
    expect(value.spentAt).toBe('2026-09-24')
    expect(value.remark).toBe('For RC194')
  })

  it('treats a blank discount as zero', () => {
    const value = expectOk(parseExpenseForm('material', material({ discount: '' })))
    expect(value.amountCents).toBe(5_000_000)
    expect(value.details.discountCents).toBe(0)
  })

  it('treats an entirely absent discount as zero', () => {
    const { discount: _discount, ...withoutDiscount } = material()
    const value = expectOk(parseExpenseForm('material', withoutDiscount))
    expect(value.amountCents).toBe(5_000_000)
  })

  it('nulls a blank description and remark', () => {
    const value = expectOk(parseExpenseForm('material', material({ description: '', remark: '   ' })))
    expect(value.details.description).toBeNull()
    expect(value.remark).toBeNull()
  })

  it('rejects a discount larger than the price', () => {
    const error = expectError(parseExpenseForm('material', material({ price: '1,000.00', discount: '1,000.01' })))
    expect(error).toBe('Discount cannot be more than the price.')
  })

  it('accepts a discount exactly equal to the price', () => {
    const value = expectOk(parseExpenseForm('material', material({ price: '1,000.00', discount: '1,000.00' })))
    expect(value.amountCents).toBe(0)
  })

  it('rejects a missing name', () => {
    expect(expectError(parseExpenseForm('material', material({ name: '  ' })))).toBe('Give the material a name')
  })

  it('rejects a missing shop', () => {
    expect(expectError(parseExpenseForm('material', material({ shopId: '' })))).toBe('Choose a shop')
  })

  it('rejects an unparseable price', () => {
    expect(expectError(parseExpenseForm('material', material({ price: 'a lot' })))).toContain('price')
  })

  it('rejects a missing date', () => {
    expect(expectError(parseExpenseForm('material', material({ spentAt: '' })))).toBe('Pick a date')
  })
})

describe('salary', () => {
  function salary(overrides: Record<string, unknown> = {}) {
    return { employeeType: 'part_time', employeeName: 'Sunil', salary: '12,000.00', spentAt: '2026-09-23', remark: '', ...overrides }
  }

  it('uses the salary as the amount', () => {
    const value = expectOk(parseExpenseForm('salary', salary()))
    expect(value.amountCents).toBe(1_200_000)
    expect(value.details).toEqual({ employeeType: 'part_time', employeeName: 'Sunil' })
  })

  it('defaults an absent employee type to part time', () => {
    const { employeeType: _type, ...withoutType } = salary()
    expect(expectOk(parseExpenseForm('salary', withoutType)).details.employeeType).toBe('part_time')
  })

  it('accepts permanent', () => {
    expect(expectOk(parseExpenseForm('salary', salary({ employeeType: 'permanent' }))).details.employeeType).toBe('permanent')
  })

  it('rejects an employee type that is neither', () => {
    expect(expectError(parseExpenseForm('salary', salary({ employeeType: 'contractor' })))).toBeTruthy()
  })

  it('nulls a blank employee name', () => {
    expect(expectOk(parseExpenseForm('salary', salary({ employeeName: '' }))).details.employeeName).toBeNull()
  })

  it('rejects a missing salary', () => {
    expect(expectError(parseExpenseForm('salary', salary({ salary: '' })))).toContain('salary')
  })
})

describe('business capital', () => {
  function capital(overrides: Record<string, unknown> = {}) {
    return { kind: 'tools', amount: '18,400.00', spentAt: '2026-09-20', remark: 'Router', ...overrides }
  }

  it('uses the amount', () => {
    const value = expectOk(parseExpenseForm('business_capital', capital()))
    expect(value.amountCents).toBe(1_840_000)
    expect(value.details).toEqual({ kind: 'tools' })
  })

  it('accepts every listed kind', () => {
    for (const kind of ['workshop_cost', 'vehicle_cost', 'tools', 'repair', 'other']) {
      expect(expectOk(parseExpenseForm('business_capital', capital({ kind }))).details.kind).toBe(kind)
    }
  })

  it('rejects an unlisted kind', () => {
    expect(expectError(parseExpenseForm('business_capital', capital({ kind: 'bribes' })))).toBe('Choose a type')
  })
})

describe('transport', () => {
  it('uses the price and stores no details', () => {
    const value = expectOk(
      parseExpenseForm('transport', { amount: '3,500.00', spentAt: '2026-09-19', remark: 'Lorry hire' }),
    )
    expect(value.amountCents).toBe(350_000)
    expect(value.details).toEqual({})
    expect(value.remark).toBe('Lorry hire')
  })

  it('rejects a missing price', () => {
    expect(expectError(parseExpenseForm('transport', { amount: '', spentAt: '2026-09-19', remark: '' }))).toContain('price')
  })
})

describe('the category itself', () => {
  it('fails closed on an unknown category', () => {
    expect(expectError(parseExpenseForm('crypto', {}))).toBe('Unknown expense category.')
  })

  it('fails closed on a missing category', () => {
    expect(expectError(parseExpenseForm(undefined, {}))).toBe('Unknown expense category.')
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run src/lib/expenses/schema.test.ts`
Expected: FAIL — `Failed to resolve import "./schema"`.

- [ ] **Step 6: Write the implementation**

Create `src/lib/expenses/schema.ts`:

```ts
import { z } from 'zod'
import { optionalMoney, requiredMoney } from '@/lib/moneyFields'
import { CAPITAL_KINDS, EMPLOYEE_TYPES, isExpenseCategory, type ExpenseCategory } from './categories'

// One schema per category. The output of each is split into the columns every
// expense shares (amountCents, spentAt, remark) and a details object holding only
// what is specific to that category.
//
// amountCents is ALWAYS the net cost — price minus discount for material, the single
// money field for the rest — computed once, here, so no reporting query ever has to
// know what category a row is.

const remarkField = z
  .string()
  .trim()
  .max(500, 'Use 500 characters or fewer')
  .default('')
  .transform((v) => (v === '' ? null : v))

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer`)
    .default('')
    .transform((v) => (v === '' ? null : v))

const dateField = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')

const materialSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the material a name').max(120, 'Use 120 characters or fewer'),
    description: optionalText(500),
    price: requiredMoney('Enter the price, e.g. 45,000.00'),
    discount: optionalMoney('Enter the discount as an amount, e.g. 2,500.00'),
    shopId: z.string().trim().min(1, 'Choose a shop'),
    spentAt: dateField,
    remark: remarkField,
  })
  // Enforced here rather than in the UI: a discount above the price would bank a
  // negative expense and silently under-report the month's total.
  .refine((v) => v.discount <= v.price, {
    message: 'Discount cannot be more than the price.',
    path: ['discount'],
  })

const salarySchema = z.object({
  employeeType: z.enum(EMPLOYEE_TYPES).default('part_time'),
  employeeName: optionalText(120),
  salary: requiredMoney('Enter the salary, e.g. 12,000.00'),
  spentAt: dateField,
  remark: remarkField,
})

const businessCapitalSchema = z.object({
  kind: z.enum(CAPITAL_KINDS, { message: 'Choose a type' }),
  amount: requiredMoney('Enter the amount, e.g. 18,400.00'),
  spentAt: dateField,
  remark: remarkField,
})

const transportSchema = z.object({
  amount: requiredMoney('Enter the price, e.g. 3,500.00'),
  spentAt: dateField,
  remark: remarkField,
})

export interface ParsedExpense {
  category: ExpenseCategory
  amountCents: number
  spentAt: string
  remark: string | null
  details: Record<string, unknown>
}

export type ParseResult = { ok: true; value: ParsedExpense } | { ok: false; error: string }

function fail(error: z.ZodError): ParseResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Invalid input.' }
}

/** The single entry point the server action calls. Unknown categories fail closed
 *  rather than writing an unparseable details blob. */
export function parseExpenseForm(category: unknown, raw: Record<string, unknown>): ParseResult {
  if (!isExpenseCategory(category)) return { ok: false, error: 'Unknown expense category.' }

  switch (category) {
    case 'material': {
      const parsed = materialSchema.safeParse(raw)
      if (!parsed.success) return fail(parsed.error)
      const { name, description, price, discount, shopId, spentAt, remark } = parsed.data
      return {
        ok: true,
        value: {
          category,
          amountCents: price - discount,
          spentAt,
          remark,
          details: { name, description, priceCents: price, discountCents: discount, shopId },
        },
      }
    }

    case 'salary': {
      const parsed = salarySchema.safeParse(raw)
      if (!parsed.success) return fail(parsed.error)
      const { employeeType, employeeName, salary, spentAt, remark } = parsed.data
      return {
        ok: true,
        value: { category, amountCents: salary, spentAt, remark, details: { employeeType, employeeName } },
      }
    }

    case 'business_capital': {
      const parsed = businessCapitalSchema.safeParse(raw)
      if (!parsed.success) return fail(parsed.error)
      const { kind, amount, spentAt, remark } = parsed.data
      return { ok: true, value: { category, amountCents: amount, spentAt, remark, details: { kind } } }
    }

    case 'transport': {
      const parsed = transportSchema.safeParse(raw)
      if (!parsed.success) return fail(parsed.error)
      const { amount, spentAt, remark } = parsed.data
      return { ok: true, value: { category, amountCents: amount, spentAt, remark, details: {} } }
    }
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/lib/expenses/schema.test.ts`
Expected: PASS, 25 tests.

If the "entirely absent discount" test fails, the cause is Zod v4's object parsing treating a genuinely missing key differently from an explicit `undefined` — the same trap documented at length around the checkbox handling in `src/lib/jobs/schema.ts`. `optionalMoney` already carries `.default('')`, which covers it; do not change the test to supply an explicit key, because real FormData omits blank fields.

- [ ] **Step 8: Commit**

```bash
git add src/lib/expenses/schema.ts src/lib/expenses/schema.test.ts
git commit -m "feat: add expense validation schemas"
```

---

### Task 4: Breakdown totals

Turns the database's `group by category` rows into the full ordered breakdown the page renders, with zeros for categories that had no spend.

**Files:**
- Create: `src/lib/expenses/totals.ts`
- Test: `src/lib/expenses/totals.test.ts`

**Interfaces:**
- Consumes: `EXPENSE_CATEGORIES`, `EXPENSE_CATEGORY_KEYS`, `isExpenseCategory` from `./categories`.
- Produces:
  - `interface CategoryTotalRow { category: string; totalCents: number }`
  - `interface CategoryTotal { category: ExpenseCategory; label: string; totalCents: number }`
  - `categoryBreakdown(rows: CategoryTotalRow[]): { perCategory: CategoryTotal[]; totalCents: number }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/expenses/totals.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { categoryBreakdown } from './totals'

describe('categoryBreakdown', () => {
  it('returns every category with a zero total when there is no spend', () => {
    const { perCategory, totalCents } = categoryBreakdown([])
    expect(perCategory.map((c) => c.category)).toEqual(['material', 'salary', 'business_capital', 'transport'])
    expect(perCategory.every((c) => c.totalCents === 0)).toBe(true)
    expect(totalCents).toBe(0)
  })

  it('fills in the categories that have spend and zeroes the rest', () => {
    const { perCategory, totalCents } = categoryBreakdown([
      { category: 'salary', totalCents: 14_500_000 },
      { category: 'material', totalCents: 38_650_000 },
    ])
    expect(perCategory).toEqual([
      { category: 'material', label: 'Material', totalCents: 38_650_000 },
      { category: 'salary', label: 'Salaries', totalCents: 14_500_000 },
      { category: 'business_capital', label: 'Business Capital', totalCents: 0 },
      { category: 'transport', label: 'Transport', totalCents: 0 },
    ])
    expect(totalCents).toBe(53_150_000)
  })

  it('keeps registry order regardless of the order rows arrive in', () => {
    const { perCategory } = categoryBreakdown([
      { category: 'transport', totalCents: 1 },
      { category: 'material', totalCents: 2 },
    ])
    expect(perCategory.map((c) => c.category)).toEqual(['material', 'salary', 'business_capital', 'transport'])
  })

  it('sums duplicate rows for the same category', () => {
    const { perCategory, totalCents } = categoryBreakdown([
      { category: 'transport', totalCents: 100 },
      { category: 'transport', totalCents: 250 },
    ])
    expect(perCategory.find((c) => c.category === 'transport')?.totalCents).toBe(350)
    expect(totalCents).toBe(350)
  })

  // A category removed from the registry leaves its historical rows in the table.
  // They must not appear under a made-up label, and must not silently vanish from
  // the grand total either — so they are excluded from both, consistently.
  it('ignores a category the registry no longer knows', () => {
    const { perCategory, totalCents } = categoryBreakdown([
      { category: 'material', totalCents: 500 },
      { category: 'crypto', totalCents: 999 },
    ])
    expect(perCategory).toHaveLength(4)
    expect(totalCents).toBe(500)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/expenses/totals.test.ts`
Expected: FAIL — `Failed to resolve import "./totals"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/expenses/totals.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/expenses/totals.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expenses/totals.ts src/lib/expenses/totals.test.ts
git commit -m "feat: add the expense category breakdown"
```

---

### Task 5: Database tables and migration

**Files:**
- Modify: `src/db/schema.ts` (append at the end)
- Create: `src/db/migrations/0006_*.sql` (generated by drizzle-kit)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `expenses` and `shops` table objects exported from `@/db/schema`.

- [ ] **Step 1: Add the tables**

Append to `src/db/schema.ts`:

```ts
// ---------------------------------------------------------------------------
// Expenses. See docs/superpowers/specs/2026-09-24-admin-expenses-design.md
// ---------------------------------------------------------------------------

// Shops Material can be bought from. A table rather than free text in `details`:
// typed strings would produce "Ajith Hardware", "ajith hardware" and "Ajith Hardwares"
// as three distinct shops inside a month, after which no per-shop question could be
// answered. The case-insensitive unique index is the structural guarantee, the same
// role the partial unique index plays on unit_options.
export const shops = pgTable(
  'shops',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('shops_name_lower').on(sql`lower(${t.name})`)],
)

// One row per expense, in any category. The four columns every category shares are
// real columns — so the list, the filters and the monthly breakdown are written once
// and never change — while the per-category fields live in `details`, shaped by that
// category's Zod schema in src/lib/expenses/schema.ts. Adding a category is a registry
// entry and needs no migration.
//
// `details` is not type-checked by Postgres; the Zod schema is the only guard. That is
// acceptable here because there is exactly one writer (the addExpense server action)
// and this is internal bookkeeping — it would not be acceptable for `jobs`.
//
// `amount_cents` is ALWAYS the net cost: price minus discount for material, the single
// money field for the rest. The gross price and discount are kept in `details`, so the
// breakdown sums one column without knowing what category a row is.
export const expenses = pgTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    category: text('category').notNull(), // 'material' | 'salary' | 'business_capital' | 'transport'
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    spentAt: date('spent_at').notNull(),
    remark: text('remark'),
    details: jsonb('details').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('expenses_spent_at_idx').on(t.spentAt), index('expenses_category_idx').on(t.category)],
)
```

Every identifier used here (`sql`, `bigint`, `date`, `index`, `jsonb`, `pgTable`, `text`, `timestamp`, `uniqueIndex`) is already imported at the top of the file — no import changes are needed.

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: a new `src/db/migrations/0006_<name>.sql` plus an updated `meta/_journal.json` and `meta/0006_snapshot.json`.

- [ ] **Step 3: Verify the generated SQL, especially the expression index**

Read the generated `0006_*.sql`. It must contain `CREATE TABLE "shops"`, `CREATE TABLE "expenses"`, and three indexes.

The one to check by eye is the unique index on the shop name — it must be on the *expression*, not the bare column:

```sql
CREATE UNIQUE INDEX "shops_name_lower" ON "shops" USING btree (lower("name"));
```

If drizzle-kit emitted `("name")` instead of `(lower("name"))`, edit the generated SQL by hand to the form above. Getting this wrong is silent: `Ajith Hardware` and `ajith hardware` would both insert and the duplicate-shop guard would never fire.

- [ ] **Step 4: Apply the migration**

Run: `npm run db:migrate`
Expected: applied without error. Then confirm the guard actually works, against the real database:

```bash
psql "$DATABASE_URL" -c "insert into shops (id, name) values ('t1', 'Ajith Hardware');"
psql "$DATABASE_URL" -c "insert into shops (id, name) values ('t2', 'ajith hardware');"  # must FAIL
psql "$DATABASE_URL" -c "delete from shops where id in ('t1','t2');"
```

Expected: the second insert fails with `duplicate key value violates unique constraint "shops_name_lower"`. If it succeeds, go back to Step 3.

- [ ] **Step 5: Run the suite and lint**

Run: `npm test && npm run lint`
Expected: PASS — no behaviour changed, this step catches a typo in the schema file.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/migrations
git commit -m "feat: add the expenses and shops tables"
```

---

### Task 6: Queries and server actions

**Files:**
- Create: `src/lib/expenses/queries.ts`
- Create: `src/app/admin/(protected)/expenses/actions.ts`
- Test: `src/app/admin/(protected)/expenses/actions.test.ts`

**Interfaces:**
- Consumes: `expenses`, `shops` from `@/db/schema`; `db` from `@/db/client`; `monthRange` from `@/lib/expenses/month`; `parseExpenseForm` from `@/lib/expenses/schema`; `isExpenseCategory` from `@/lib/expenses/categories`; `verifyAdminSession` from `@/lib/adminAuth`.
- Produces:
  - From `queries.ts`: `EXPENSES_PAGE_SIZE = 10`; `interface ExpenseListFilters { month?: string; category?: string; page?: number }`; `listExpenses(filters)` → `{ rows, page, totalPages, total }`; `monthCategoryTotals(filters)` → `CategoryTotalRow[]`; `listShops()` → `{ id: string; name: string }[]`; `resolveShopId(name: string)` → `Promise<string>`
  - From `actions.ts`: `interface ActionState { error?: string; success?: boolean }`; `addExpense(prev, formData)`; `deleteExpense(formData)`

- [ ] **Step 1: Write the queries**

Create `src/lib/expenses/queries.ts`:

```ts
import 'server-only'
import { randomUUID } from 'crypto'
import { and, asc, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm'
import { db } from '@/db/client'
import { expenses, shops } from '@/db/schema'
import { isExpenseCategory } from './categories'
import { monthRange } from './month'

export const EXPENSES_PAGE_SIZE = 10

export interface ExpenseListFilters {
  /** 'YYYY-MM'. An unparseable or absent month means no date bound at all. */
  month?: string
  category?: string
  /** 1-based. Defaults to 1. */
  page?: number
}

/** Shared by the list and the breakdown, so the two can never disagree about which
 *  rows they are describing. */
function buildWhere(filters: ExpenseListFilters) {
  const conditions = []

  const range = filters.month ? monthRange(filters.month) : null
  if (range) {
    conditions.push(gte(expenses.spentAt, range.start))
    conditions.push(lte(expenses.spentAt, range.end))
  }
  if (isExpenseCategory(filters.category)) {
    conditions.push(eq(expenses.category, filters.category))
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

export async function listExpenses(filters: ExpenseListFilters = {}) {
  const where = buildWhere(filters)
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(where)
      // Two keys: spent_at is what the admin cares about, created_at breaks ties so
      // two expenses entered on the same date keep a stable, repeatable order across
      // pages instead of drifting between queries.
      .orderBy(desc(expenses.spentAt), desc(expenses.createdAt))
      .limit(EXPENSES_PAGE_SIZE)
      .offset((page - 1) * EXPENSES_PAGE_SIZE),
    db.select({ total: count() }).from(expenses).where(where),
  ])

  return { rows, page, total, totalPages: Math.max(1, Math.ceil(total / EXPENSES_PAGE_SIZE)) }
}

/** Totals across the WHOLE filtered period, not just the current page — the
 *  breakdown describes the month, not the ten rows on screen. */
export async function monthCategoryTotals(filters: ExpenseListFilters = {}) {
  const rows = await db
    .select({ category: expenses.category, totalCents: sum(expenses.amountCents) })
    .from(expenses)
    .where(buildWhere(filters))
    .groupBy(expenses.category)

  // sum() comes back as a string (or null for an empty group) because Postgres widens
  // it to numeric — Number() here, not in the pure totals module, keeps that database
  // quirk at the database boundary.
  return rows.map((row) => ({ category: row.category, totalCents: Number(row.totalCents ?? 0) }))
}

export async function listShops() {
  return db.select({ id: shops.id, name: shops.name }).from(shops).orderBy(asc(shops.name))
}

/** Returns the id of the shop with this name, creating it if it is new. Matching is
 *  case-insensitive, mirroring the unique index. */
export async function resolveShopId(name: string): Promise<string> {
  const trimmed = name.trim()

  const [existing] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(sql`lower(${shops.name}) = lower(${trimmed})`)
    .limit(1)
  if (existing) return existing.id

  const id = randomUUID()
  try {
    await db.insert(shops).values({ id, name: trimmed })
    return id
  } catch {
    // Two admins adding the same new shop at the same moment: the unique index rejects
    // the loser, whose correct answer is the row the winner just wrote, not an error.
    const [raced] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(sql`lower(${shops.name}) = lower(${trimmed})`)
      .limit(1)
    if (raced) return raced.id
    throw new Error('Could not save that shop.')
  }
}
```

- [ ] **Step 2: Write the failing action test**

Create `src/app/admin/(protected)/expenses/actions.test.ts`. It mocks the database and the queries module, in the style of `src/app/admin/(protected)/jobs/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const resolveShopId = vi.fn()
vi.mock('@/lib/expenses/queries', () => ({ resolveShopId }))

const insertValues = vi.fn().mockResolvedValue(undefined)
const deleteWhere = vi.fn().mockResolvedValue(undefined)
vi.mock('@/db/client', () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  },
}))

import { verifyAdminSession } from '@/lib/adminAuth'
import { addExpense, deleteExpense } from './actions'

function formData(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.append(key, value)
  return data
}

function materialForm(overrides: Record<string, string> = {}) {
  return formData({
    category: 'material',
    name: '18mm MDF board',
    description: '',
    price: '50,000.00',
    discount: '2,500.00',
    shopId: 'shop-1',
    spentAt: '2026-09-24',
    remark: '',
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveShopId.mockResolvedValue('shop-new')
})

describe('addExpense', () => {
  it('checks the admin session before doing anything', async () => {
    await addExpense({}, materialForm())
    expect(verifyAdminSession).toHaveBeenCalled()
  })

  it('inserts the net amount and the details blob', async () => {
    const result = await addExpense({}, materialForm())
    expect(result).toEqual({ success: true })
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'material',
        amountCents: 4_750_000,
        spentAt: '2026-09-24',
        remark: null,
        details: expect.objectContaining({ name: '18mm MDF board', shopId: 'shop-1' }),
      }),
    )
  })

  it('creates the shop when a new one was typed, and stores its id', async () => {
    await addExpense({}, materialForm({ shopId: '__new__', newShopName: 'Nawaloka Timber' }))
    expect(resolveShopId).toHaveBeenCalledWith('Nawaloka Timber')
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ details: expect.objectContaining({ shopId: 'shop-new' }) }),
    )
  })

  it('rejects a new shop with a blank name', async () => {
    const result = await addExpense({}, materialForm({ shopId: '__new__', newShopName: '   ' }))
    expect(result).toEqual({ error: 'Enter the new shop name.' })
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('does not touch the shops table for a category that has no shop', async () => {
    await addExpense({}, formData({ category: 'transport', amount: '3,500.00', spentAt: '2026-09-19', remark: '' }))
    expect(resolveShopId).not.toHaveBeenCalled()
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ category: 'transport', amountCents: 350_000 }))
  })

  it('returns the validation message and writes nothing when the discount exceeds the price', async () => {
    const result = await addExpense({}, materialForm({ price: '1,000.00', discount: '2,000.00' }))
    expect(result).toEqual({ error: 'Discount cannot be more than the price.' })
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('fails closed on an unknown category', async () => {
    const result = await addExpense({}, formData({ category: 'crypto' }))
    expect(result).toEqual({ error: 'Unknown expense category.' })
    expect(insertValues).not.toHaveBeenCalled()
  })
})

describe('deleteExpense', () => {
  it('checks the admin session', async () => {
    await deleteExpense(formData({ id: 'expense-1' }))
    expect(verifyAdminSession).toHaveBeenCalled()
  })

  it('deletes the row', async () => {
    await deleteExpense(formData({ id: 'expense-1' }))
    expect(deleteWhere).toHaveBeenCalled()
  })

  it('does nothing without an id', async () => {
    await deleteExpense(formData({}))
    expect(deleteWhere).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/expenses/actions.test.ts"`
Expected: FAIL — `Failed to resolve import "./actions"`.

- [ ] **Step 4: Write the actions**

Create `src/app/admin/(protected)/expenses/actions.ts`:

```ts
'use server'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { expenses } from '@/db/schema'
import { resolveShopId } from '@/lib/expenses/queries'
import { parseExpenseForm } from '@/lib/expenses/schema'

export interface ActionState {
  error?: string
  success?: boolean
}

/** The Shop dropdown's "add a new one" sentinel. A value no real uuid can collide with. */
export const NEW_SHOP_VALUE = '__new__'

export async function addExpense(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const raw = Object.fromEntries(formData) as Record<string, unknown>
  const category = raw.category

  // The shop is resolved BEFORE validation, so the schema only ever sees a real id and
  // needs no knowledge of the "__new__" sentinel. Keeping that sentinel out of the
  // schema is what lets a future dropdown-backed field reuse the same pattern.
  if (raw.shopId === NEW_SHOP_VALUE) {
    const name = typeof raw.newShopName === 'string' ? raw.newShopName.trim() : ''
    if (name === '') return { error: 'Enter the new shop name.' }
    try {
      raw.shopId = await resolveShopId(name)
    } catch {
      return { error: 'Could not save that shop.' }
    }
  }

  const parsed = parseExpenseForm(category, raw)
  if (!parsed.ok) return { error: parsed.error }

  await db.insert(expenses).values({
    id: randomUUID(),
    category: parsed.value.category,
    amountCents: parsed.value.amountCents,
    spentAt: parsed.value.spentAt,
    remark: parsed.value.remark,
    details: parsed.value.details,
  })

  revalidatePath('/admin/expenses')
  return { success: true }
}

/** Plain (formData)-only signature, bound directly as a form action — there is no
 *  per-row pending/error UI to feed, matching deleteClause. Hard delete: an expense
 *  row is referenced by nothing. */
export async function deleteExpense(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await db.delete(expenses).where(eq(expenses.id, id))

  revalidatePath('/admin/expenses')
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/expenses/actions.test.ts"`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/expenses/queries.ts "src/app/admin/(protected)/expenses/actions.ts" "src/app/admin/(protected)/expenses/actions.test.ts"
git commit -m "feat: add expense queries and the add/delete actions"
```

---

### Task 7: The expense form

The client component: four category buttons, and fields rendered from the registry's descriptors.

**Files:**
- Create: `src/app/admin/(protected)/expenses/ExpenseForm.tsx`
- Test: `src/app/admin/(protected)/expenses/ExpenseForm.test.tsx`

**Interfaces:**
- Consumes: `EXPENSE_CATEGORIES`, `EXPENSE_CATEGORY_KEYS`, `type ExpenseCategory`, `type ExpenseField` from `@/lib/expenses/categories`; `addExpense`, `NEW_SHOP_VALUE`, `type ActionState` from `./actions`.
- Produces: `<ExpenseForm shops={...} today="YYYY-MM-DD" />`, where `shops: { id: string; name: string }[]`.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/(protected)/expenses/ExpenseForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('./actions', () => ({ addExpense: vi.fn(), NEW_SHOP_VALUE: '__new__' }))

import { ExpenseForm } from './ExpenseForm'

const SHOPS = [
  { id: 'shop-1', name: 'Ajith Hardware' },
  { id: 'shop-2', name: 'Nawaloka Timber' },
]

function setup() {
  return render(<ExpenseForm shops={SHOPS} today="2026-09-24" />)
}

describe('ExpenseForm', () => {
  it('starts on Material and shows its fields', () => {
    setup()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Price')).toBeInTheDocument()
    expect(screen.getByLabelText('Discount')).toBeInTheDocument()
    expect(screen.getByLabelText('Shop')).toBeInTheDocument()
  })

  it('defaults the date to today', () => {
    setup()
    expect(screen.getByLabelText('Date')).toHaveValue('2026-09-24')
  })

  it('submits the selected category', () => {
    setup()
    expect(screen.getByTestId('expense-category')).toHaveValue('material')
  })

  it('swaps to the salary fields when Salaries is chosen', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Salaries' }))

    expect(screen.getByLabelText('Salary')).toBeInTheDocument()
    expect(screen.getByLabelText('Employee name')).toBeInTheDocument()
    expect(screen.queryByLabelText('Price')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Shop')).not.toBeInTheDocument()
    expect(screen.getByTestId('expense-category')).toHaveValue('salary')
  })

  it('pre-selects Part time on the employee type radio', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Salaries' }))
    expect(screen.getByRole('radio', { name: 'Part time' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Permanent' })).not.toBeChecked()
  })

  it('lists every business capital type', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Business Capital' }))
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(
      expect.arrayContaining(['Workshop cost', 'Vehicle cost', 'Tools', 'Repair', 'Other']),
    )
  })

  it('shows only price, date and remark for transport', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Transport' }))
    expect(screen.getByLabelText('Price')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Remark')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('lists the shops it was given', () => {
    setup()
    expect(screen.getByRole('option', { name: 'Ajith Hardware' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Nawaloka Timber' })).toBeInTheDocument()
  })

  it('reveals a name input when a new shop is chosen, and hides it again', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.queryByLabelText('New shop name')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Shop'), '__new__')
    expect(screen.getByLabelText('New shop name')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Shop'), 'shop-1')
    expect(screen.queryByLabelText('New shop name')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/expenses/ExpenseForm.test.tsx"`
Expected: FAIL — `Failed to resolve import "./ExpenseForm"`.

- [ ] **Step 3: Write the implementation**

Create `src/app/admin/(protected)/expenses/ExpenseForm.tsx`:

```tsx
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
      setShopChoice('')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  function renderField(field: ExpenseField) {
    const id = `expense-${field.name}`
    const label = (
      <label htmlFor={id} className={LABEL}>
        {field.label}
        {!field.required && <span className="text-navy/50"> (optional)</span>}
      </label>
    )
    const hint = field.hint ? <span className={HINT}>{field.hint}</span> : null

    switch (field.kind) {
      case 'textarea':
        return (
          <div key={field.name}>
            {label}
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
            <input id={id} type="text" name={field.name} required={field.required} className={FIELD} />
            {hint}
          </div>
        )
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4 border-2 border-navy p-4">
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/expenses/ExpenseForm.test.tsx"`
Expected: PASS, 9 tests.

If `getByLabelText('Date')` fails to match, the cause is the `(optional)` span inside the `<label>` changing its accessible name — Date is required so it should not have one. Check `required: true` on the shared `dateField` in the registry rather than loosening the query.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)/expenses/ExpenseForm.tsx" "src/app/admin/(protected)/expenses/ExpenseForm.test.tsx"
git commit -m "feat: add the dynamic expense form"
```

---

### Task 8: Filters, breakdown and row

Three small presentational pieces, built together because none is independently useful and they share the page's vocabulary.

**Files:**
- Create: `src/app/admin/(protected)/expenses/ExpenseFilters.tsx`
- Create: `src/app/admin/(protected)/expenses/ExpenseBreakdown.tsx`
- Create: `src/app/admin/(protected)/expenses/ExpenseRow.tsx`
- Test: `src/app/admin/(protected)/expenses/ExpenseBreakdown.test.tsx`

**Interfaces:**
- Consumes: `formatCents` from `@/lib/money`; `formatMonthLabel` from `@/lib/expenses/month`; `EXPENSE_CATEGORIES`, `EXPENSE_CATEGORY_KEYS` from `@/lib/expenses/categories`; `type CategoryTotal` from `@/lib/expenses/totals`; `deleteExpense` from `./actions`.
- Produces:
  - `<ExpenseFilters months={string[]} />`
  - `<ExpenseBreakdown perCategory={CategoryTotal[]} totalCents={number} entryCount={number} />`
  - `<ExpenseRow expense={{ id, category, amountCents, spentAt, detail }} />`

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/(protected)/expenses/ExpenseBreakdown.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpenseBreakdown } from './ExpenseBreakdown'

const PER_CATEGORY = [
  { category: 'material' as const, label: 'Material', totalCents: 38_650_000 },
  { category: 'salary' as const, label: 'Salaries', totalCents: 14_500_000 },
  { category: 'business_capital' as const, label: 'Business Capital', totalCents: 0 },
  { category: 'transport' as const, label: 'Transport', totalCents: 1_840_000 },
]

describe('ExpenseBreakdown', () => {
  it('lists every category with its grouped total', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={54_990_000} entryCount={42} />)
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('386,500.00')).toBeInTheDocument()
    expect(screen.getByText('145,000.00')).toBeInTheDocument()
  })

  it('shows a zero rather than hiding a category with no spend', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={54_990_000} entryCount={42} />)
    expect(screen.getByText('Business Capital')).toBeInTheDocument()
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('shows the grand total and the entry count', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={54_990_000} entryCount={42} />)
    expect(screen.getByTestId('expense-total')).toHaveTextContent('549,900.00')
    expect(screen.getByText('42 entries')).toBeInTheDocument()
  })

  it('says "1 entry", not "1 entries"', () => {
    render(<ExpenseBreakdown perCategory={PER_CATEGORY} totalCents={100} entryCount={1} />)
    expect(screen.getByText('1 entry')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/expenses/ExpenseBreakdown.test.tsx"`
Expected: FAIL — `Failed to resolve import "./ExpenseBreakdown"`.

- [ ] **Step 3: Write ExpenseBreakdown**

Create `src/app/admin/(protected)/expenses/ExpenseBreakdown.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/expenses/ExpenseBreakdown.test.tsx"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write ExpenseFilters**

Create `src/app/admin/(protected)/expenses/ExpenseFilters.tsx`:

```tsx
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
```

- [ ] **Step 6: Write ExpenseRow**

Create `src/app/admin/(protected)/expenses/ExpenseRow.tsx`:

```tsx
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
```

- [ ] **Step 7: Run the suite and lint**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add "src/app/admin/(protected)/expenses/ExpenseFilters.tsx" "src/app/admin/(protected)/expenses/ExpenseBreakdown.tsx" "src/app/admin/(protected)/expenses/ExpenseBreakdown.test.tsx" "src/app/admin/(protected)/expenses/ExpenseRow.tsx"
git commit -m "feat: add the expense filters, breakdown and list row"
```

---

### Task 9: The page, pagination and the dashboard tile

Wires everything together and puts the section on the dashboard. This is the task that makes the feature reachable.

**Files:**
- Create: `src/app/admin/(protected)/expenses/page.tsx`
- Create: `src/app/admin/(protected)/expenses/ExpensesPagination.tsx`
- Create: `src/app/admin/(protected)/expenses/loading.tsx`
- Modify: `src/app/admin/(protected)/page.tsx` (one entry in `TILES`)

**Interfaces:**
- Consumes: everything produced by Tasks 1–8.
- Produces: the route `/admin/expenses`.

- [ ] **Step 1: Write the pagination component**

Create `src/app/admin/(protected)/expenses/ExpensesPagination.tsx`. It is `JobsPagination` with this page's query keys — copied rather than generalised, because the two differ only in their `searchParams` shape and a shared version would need a generic parameter for no reader's benefit:

```tsx
import Link from 'next/link'

const BUTTON = 'flex h-8 min-w-8 items-center justify-center border-2 border-navy px-2 u-mono text-xs transition duration-200'
const ACTIVE = `${BUTTON} bg-navy font-display text-paper`
const INACTIVE = `${BUTTON} hover:bg-navy hover:text-paper`
const DISABLED = `${BUTTON} border-navy/30 text-navy/30`

function pageWindow(page: number, totalPages: number): (number | 'ellipsis')[] {
  const window = 1
  const pages = new Set<number>([1, totalPages])
  for (let p = page - window; p <= page + window; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis')
    result.push(sorted[i])
  }
  return result
}

export function ExpensesPagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number
  totalPages: number
  searchParams: { month?: string; category?: string }
}) {
  if (totalPages <= 1) return null

  function href(target: number) {
    const params = new URLSearchParams()
    if (searchParams.month) params.set('month', searchParams.month)
    if (searchParams.category) params.set('category', searchParams.category)
    if (target > 1) params.set('page', String(target))
    const qs = params.toString()
    return qs ? `?${qs}` : '?'
  }

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={INACTIVE} aria-label="Previous page">
          ←
        </Link>
      ) : (
        <span className={DISABLED} aria-hidden="true">
          ←
        </span>
      )}

      {pageWindow(page, totalPages).map((entry, i) =>
        entry === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="u-mono px-1 text-xs text-navy/50">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={entry === page ? ACTIVE : INACTIVE}
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} className={INACTIVE} aria-label="Next page">
          →
        </Link>
      ) : (
        <span className={DISABLED} aria-hidden="true">
          →
        </span>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Write the loading state**

Create `src/app/admin/(protected)/expenses/loading.tsx`:

```tsx
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen'

export default function Loading() {
  return <AdminLoadingScreen />
}
```

- [ ] **Step 3: Write the page**

Create `src/app/admin/(protected)/expenses/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Add the dashboard tile**

In `src/app/admin/(protected)/page.tsx`, append to the `TILES` array, after the Quotations entry:

```ts
  {
    label: 'Expenses',
    description: 'Material, salaries, capital and transport costs',
    href: '/admin/expenses',
  },
```

- [ ] **Step 5: Run the full suite, lint and a production build**

```bash
npm test
npm run lint
npm run build
```

Expected: all three PASS. The build is what catches a server/client boundary mistake — a server component importing a client-only hook, or `ExpenseForm` being rendered without `'use client'` at the top of its file.

- [ ] **Step 6: Check it in the real browser**

Run `npm run dev`, sign in to `/admin`, and confirm each of these by hand — jsdom cannot see any of them:

1. The Expenses tile appears on the dashboard and opens the page.
2. Saving a Material with a price and a discount lists it at the **net** amount.
3. "+ Add new shop…" reveals the name input; the saved shop appears in the dropdown next time. Adding it again with different capitalisation reuses the same shop rather than creating a twin.
4. Switching category swaps the fields and clears anything typed.
5. A discount above the price shows the toast `Discount cannot be more than the price.` and saves nothing.
6. The breakdown totals match the rows, and a category with no spend shows `0.00`.
7. Changing the month filter updates both the list and the breakdown, and the URL.
8. The delete button asks once, then removes the row.
9. With more than ten rows in a month, page 2 works and keeps the filters.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/expenses" "src/app/admin/(protected)/page.tsx"
git commit -m "feat: add the expenses page and its dashboard tile"
```

---

## Plan Self-Review

Checked against `docs/superpowers/specs/2026-09-24-admin-expenses-design.md`:

| Spec requirement | Task |
|---|---|
| `expenses` table, shared columns + JSONB details | 5 |
| `shops` table with a case-insensitive unique name | 5 (index verified against the live database in Step 4) |
| `amount_cents` always net | 3 (computed), 5 (documented), 4 (summed) |
| Category registry with the seven field kinds | 2 |
| Material / Salaries / Business Capital / Transport field lists | 2, with validation in 3 |
| Employee name optional | 2, 3 |
| Business Capital types in code | 2 |
| Four category buttons, fields swap | 7 |
| Inline "Add new shop…" | 7 (UI), 6 (`resolveShopId`, including the race) |
| Filters in the URL, default current month | 8, 9 |
| Per-category breakdown + grand total for the filtered period | 4, 8, 9 |
| List, newest first, 10 per page | 6, 9 |
| Delete with a confirm, no editing | 8 |
| Discount > price rejected, exact message | 3, asserted in 3 and 6 |
| Unknown category fails closed | 2, 3, 6 |
| Empty month shows a message, not a broken table | 9 |
| Future dates accepted | 3 (`dateField` has no upper bound) |
| The four named test files | 1, 2, 3, 4 |
| Tile reads "Expenses" | 9 |

No gaps. Names used across tasks are consistent: `parseExpenseForm`, `categoryBreakdown`, `listExpenses`, `monthCategoryTotals`, `listShops`, `resolveShopId`, `addExpense`, `deleteExpense`, `NEW_SHOP_VALUE`, `EXPENSE_CATEGORIES`, `EXPENSE_CATEGORY_KEYS`, `isExpenseCategory`, `monthRange`, `recentMonths`, `formatMonthLabel`, `currentMonth`.

Two deviations from the spec, both deliberate and both noted where they occur:

1. The spec listed `totals.ts` and `month.ts` without naming their exports; this plan fixes them as `categoryBreakdown` and the five month helpers.
2. The spec did not mention `src/lib/moneyFields.ts`. Task 3 extracts the two money-field helpers that `src/lib/jobs/schema.ts` keeps private, rather than copying them into the expenses schema — a two-function move, committed separately and behind the existing suite.
