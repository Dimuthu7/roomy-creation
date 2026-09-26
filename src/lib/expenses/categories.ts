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
