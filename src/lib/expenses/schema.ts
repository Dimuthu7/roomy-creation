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
