import { z } from 'zod'
import { parseMoneyToCents } from '@/lib/money'

export const JOB_STAGES = ['quotation', 'order'] as const
export const JOB_STATUSES = ['pending', 'in_progress', 'finished'] as const
export const CLAUSE_KINDS = ['terms', 'warranty'] as const

export const STATUS_LABELS: Record<(typeof JOB_STATUSES)[number], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  finished: 'Finished',
}

const blankToNull = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .default('')

// Same rule as the public enquiry form: optional, but must look like an address when
// given at all.
const optionalEmail = z
  .string()
  .trim()
  .max(254, 'Use 254 characters or fewer')
  .refine((v) => v === '' || /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v), 'That email address is missing a domain')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .default('')

/** A money field that must be present. */
function requiredMoney(message: string) {
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
function optionalMoney(message: string) {
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

// An HTML checkbox submits 'on' when ticked and is ABSENT ENTIRELY from FormData when
// not — there is no key at all, not a key with an undefined value. Those two are
// different things to Zod v4's object parsing: z.undefined() as a union member only
// matches a key that exists and holds undefined, not a key that was never set. The
// field must be marked .optional() itself for the enclosing z.object() to tolerate a
// genuinely missing key. Getting this wrong fails validation on every real unchecked
// checkbox in production while still passing a unit test that hands the schema
// `{ field: undefined }` directly (an explicit key), which is why this needs its own
// "field entirely absent from the object" test case, not just an explicit-undefined one.
const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal('')])
  .optional()
  .transform((v) => v === 'on' || v === 'true')

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required').max(120, 'Use 120 characters or fewer'),
  phone: z
    .string()
    .trim()
    .max(30, 'Use 30 characters or fewer')
    .refine((v) => v.replace(/\D/g, '').length >= 9, 'Enter a phone number we can call back on'),
  email: optionalEmail,
  addressLines: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== ''),
    ),
  city: blankToNull,
  district: blankToNull,
  notes: blankToNull,
})

export type CustomerFormInput = z.infer<typeof customerFormSchema>

export const jobDetailsFormSchema = z
  .object({
    salesPerson: blankToNull,
    quotationDate: z.string().trim().min(1, 'Quotation date is required'),
    estimationDate: blankToNull,
    freeDelivery: checkbox,
    deliveryCharge: z.string().default(''),
    discountLabel: z.string().trim().default('Cash Discount'),
    discount: optionalMoney('Discount must be an amount like 30,000.00'),
    advance: z.string().default(''),
    status: z.enum(JOB_STATUSES),
    notes: blankToNull,
  })
  .transform((data, ctx) => {
    // Free delivery wins: whatever is left in the amount field is discarded, so
    // re-ticking the box can never leave a stale charge on the job.
    let deliveryChargeCents: number | null = null
    if (!data.freeDelivery && data.deliveryCharge.trim() !== '') {
      const cents = parseMoneyToCents(data.deliveryCharge)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: 'Delivery charge must be an amount like 5,000.00', path: ['deliveryCharge'] })
        return z.NEVER
      }
      deliveryChargeCents = cents
    }

    let advanceCents: number | null = null
    if (data.advance.trim() !== '') {
      const cents = parseMoneyToCents(data.advance)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: 'Advance must be an amount like 240,000.00', path: ['advance'] })
        return z.NEVER
      }
      advanceCents = cents
    }

    return {
      salesPerson: data.salesPerson,
      quotationDate: data.quotationDate,
      estimationDate: data.estimationDate,
      freeDelivery: data.freeDelivery,
      deliveryChargeCents,
      discountLabel: data.discountLabel === '' ? 'Cash Discount' : data.discountLabel,
      discountCents: data.discount,
      advanceCents,
      status: data.status,
      notes: data.notes,
    }
  })

export type JobDetailsFormInput = z.infer<typeof jobDetailsFormSchema>

export const clauseFormSchema = z.object({
  kind: z.enum(CLAUSE_KINDS),
  body: z.string().trim().min(1, 'Clause text is required'),
  emphasis: checkbox,
})

export type ClauseFormInput = z.infer<typeof clauseFormSchema>

// The unit editor is a client component holding nested state, so it posts JSON in a
// hidden field rather than trying to express nesting in flat FormData keys.
const specLineSchema = z.object({
  label: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(''),
  value: z.string().default(''),
})

const optionSchema = z.object({
  label: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(''),
  price: requiredMoney('Every option needs a price like 182,500.00'),
  qty: z.string().transform((v, ctx) => {
    const n = Number(v)
    if (!Number.isInteger(n) || n < 1) {
      ctx.addIssue({ code: 'custom', message: 'Quantity must be a whole number of 1 or more' })
      return z.NEVER
    }
    return n
  }),
  selected: z.boolean().default(false),
  specs: z.array(specLineSchema).default([]),
})

const unitSchema = z.object({
  title: z.string().trim().min(1, 'Every unit needs a title'),
  options: z.array(optionSchema).min(1, 'Every unit needs at least one priced option'),
})

export const jobUnitsSchema = z.array(unitSchema).transform((units, ctx) =>
  units.map((unit, unitIndex) => {
    // Mirrors the partial unique index in the database. Checked here too so the admin
    // gets a readable message instead of a constraint violation.
    if (unit.options.filter((o) => o.selected).length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: `"${unit.title}" has more than one option selected — pick just one`,
        path: [unitIndex, 'options'],
      })
      return z.NEVER
    }
    return {
      title: unit.title,
      options: unit.options.map((option) => ({
        label: option.label,
        priceCents: option.price,
        qty: option.qty,
        selected: option.selected,
        // A row the admin added and left blank is not an error, it is just an empty
        // row — dropped rather than rejected.
        specs: option.specs
          .map((spec) => ({ label: spec.label, value: spec.value.trim() }))
          .filter((spec) => spec.value !== ''),
      })),
    }
  }),
)

export type JobUnitsInput = z.infer<typeof jobUnitsSchema>
