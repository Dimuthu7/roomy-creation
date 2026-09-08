# Admin Quotations (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Roomy Creations' paper quotation process with an admin section that composes a quotation from units, priced options and specification lines, renders it as a PDF matching the existing document, and emails it to the customer.

**Architecture:** One `jobs` row per job carries the whole lifecycle (see the spec's "Core decision"). A job has ordered `job_units`, each with one or more `unit_options`, each with its own ordered `option_specs`. Pure logic — money, totals, reference numbers, snapshot building — lives in `src/lib/` and is unit tested; database access lives in Server Actions under the existing `(protected)` route group; PDF components take a snapshot and nothing else.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19.2, Drizzle ORM 0.45 on Neon Postgres, Zod 4.4, Tailwind 4, Vercel Blob, Resend, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-08-admin-quotations-orders-design.md`

## Global Constraints

- **This is Next.js 16.2.12, not the Next.js you know.** Read the relevant guide in `node_modules/next/dist/docs/` before writing route handlers, Server Actions, `loading.tsx` or metadata. Per `AGENTS.md` this is mandatory, not advisory.
- **Review gate.** After completing each task, stop and ask the user to review before proceeding. Do not `git commit` and do not create or edit any markdown file until the user has explicitly confirmed after their own review. The "Commit" step in each task below means *stage and prepare*; run it only once the user confirms.
- **Money is integer cents**, stored as `bigint('...', { mode: 'number' })`. Never floats, never `numeric`.
- **Job reference format** is `RC` + the sequence zero-padded to five digits: `RC00195`. Counter seeded at 194.
- **Enumerated values are `text` columns** validated by Zod, not Postgres enums — matching the existing `testimonials.source`.
- **Every admin page** lives under `src/app/admin/(protected)/`, whose layout calls `verifyAdminSession()`. **Every Server Action calls `verifyAdminSession()` itself**, because an action is a separate entry point the layout does not cover.
- **Server Action shape** follows `src/app/admin/(protected)/site-details/actions.ts`: `export interface ActionState { error?: string; success?: boolean }`, `safeParse(Object.fromEntries(formData))`, `return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }`.
- **Currency is LKR**, rendered without a symbol as `368,500.00`.
- **Tests** import `{ describe, it, expect }` from `vitest` explicitly even though `globals: true`, matching every existing test file.
- **Styling** follows the existing admin pages: `border-2 border-navy bg-paper text-navy`, `font-display` for headings, `u-mono` for secondary text.

---

### Task 1: Money parsing and formatting

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `parseMoneyToCents(input: string): number | null`, `formatCents(cents: number): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/money.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatCents, parseMoneyToCents } from './money'

describe('parseMoneyToCents', () => {
  it('parses a plain whole number', () => {
    expect(parseMoneyToCents('368500')).toBe(36850000)
  })

  it('parses a grouped amount as typed on the existing documents', () => {
    expect(parseMoneyToCents('368,500.00')).toBe(36850000)
  })

  it('parses a single decimal place as tenths, not hundredths', () => {
    expect(parseMoneyToCents('10.5')).toBe(1050)
  })

  it('ignores surrounding and internal whitespace', () => {
    expect(parseMoneyToCents(' 22 500.00 ')).toBe(2250000)
  })

  it('returns null for an empty string', () => {
    expect(parseMoneyToCents('')).toBeNull()
  })

  it('returns null for more than two decimal places', () => {
    expect(parseMoneyToCents('10.555')).toBeNull()
  })

  it('returns null for non-numeric text', () => {
    expect(parseMoneyToCents('free')).toBeNull()
  })

  it('returns null for a negative amount', () => {
    expect(parseMoneyToCents('-100')).toBeNull()
  })
})

describe('formatCents', () => {
  it('formats with thousands separators and two decimals', () => {
    expect(formatCents(36850000)).toBe('368,500.00')
  })

  it('keeps a non-zero cents remainder', () => {
    expect(formatCents(2250050)).toBe('22,500.50')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('0.00')
  })

  it('formats an amount below one unit', () => {
    expect(formatCents(5)).toBe('0.05')
  })

  it('formats a negative amount', () => {
    expect(formatCents(-3000000)).toBe('-30,000.00')
  })

  it('round-trips through parseMoneyToCents', () => {
    expect(parseMoneyToCents(formatCents(43000000))).toBe(43000000)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/money.test.ts`
Expected: FAIL — `Failed to resolve import "./money"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/money.ts`:

```ts
// All amounts in this app are integer cents. Floats are never used for money:
// 0.1 + 0.2 !== 0.3 is not an acceptable property for a document a customer signs.

/** Parses admin money input into integer cents. Accepts the grouped form the existing
 *  paper documents use ("368,500.00") as well as a bare number. Returns null for
 *  anything that is not a non-negative amount with at most two decimal places —
 *  callers turn that into a validation message. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[\s,]/g, '')
  if (cleaned === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  // padEnd, not padStart: "10.5" is ten rupees fifty cents, not ten rupees five.
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'))
}

/** Renders cents as the documents do — grouped, two decimals, no currency symbol. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${sign}${whole.toLocaleString('en-US')}.${frac}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/money.test.ts`
Expected: PASS, 12 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: add integer-cents money parsing and formatting"
```

---

### Task 2: Document reference numbers

**Files:**
- Create: `src/lib/jobs/reference.ts`
- Test: `src/lib/jobs/reference.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `formatJobRef(seq: number): string`, `formatInvoiceNumber(seq: number): string`, `formatWarrantyNumber(seq: number): string`, `JOB_REF_SEED: number`

- [ ] **Step 1: Write the failing test**

Create `src/lib/jobs/reference.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatInvoiceNumber, formatJobRef, formatWarrantyNumber, JOB_REF_SEED } from './reference'

describe('formatJobRef', () => {
  it('pads to five digits behind the RC prefix', () => {
    expect(formatJobRef(195)).toBe('RC00195')
  })

  it('matches the numbering of the existing paper documents', () => {
    expect(formatJobRef(188)).toBe('RC00188')
    expect(formatJobRef(194)).toBe('RC00194')
  })

  it('pads a single digit', () => {
    expect(formatJobRef(1)).toBe('RC00001')
  })

  it('grows past the padding width rather than truncating', () => {
    expect(formatJobRef(123456)).toBe('RC123456')
  })

  it('sorts lexicographically in the same order as numerically within the pad width', () => {
    const sorted = [195, 1000, 99].map(formatJobRef).sort()
    expect(sorted).toEqual(['RC00099', 'RC00195', 'RC01000'])
  })
})

describe('JOB_REF_SEED', () => {
  it('is 194 so the first system-created job is RC00195', () => {
    expect(JOB_REF_SEED).toBe(194)
    expect(formatJobRef(JOB_REF_SEED + 1)).toBe('RC00195')
  })
})

describe('other document series', () => {
  it('formats invoice numbers on their own series', () => {
    expect(formatInvoiceNumber(1)).toBe('INV00001')
  })

  it('formats warranty card numbers on their own series', () => {
    expect(formatWarrantyNumber(1)).toBe('WC00001')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/reference.test.ts`
Expected: FAIL — `Failed to resolve import "./reference"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/jobs/reference.ts`:

```ts
// Padded to five digits so references sort lexicographically in the same order they
// sort numerically — which is what a plain ORDER BY ref in a list query gives us.
// Past 99999 the number simply grows and that property lapses, which is why jobs also
// stores the raw ref_seq integer to order by.
const PAD = 5

function pad(seq: number): string {
  return String(seq).padStart(PAD, '0')
}

/** The counter value the business is already at on paper — RC194 was the last
 *  hand-written quotation, so the first job this system creates is RC00195. */
export const JOB_REF_SEED = 194

export function formatJobRef(seq: number): string {
  return `RC${pad(seq)}`
}

/** Advance and final invoices share one continuous series; documents.kind tells them
 *  apart. A customer holding INV00007 should be able to find it without knowing which
 *  kind it was. */
export function formatInvoiceNumber(seq: number): string {
  return `INV${pad(seq)}`
}

export function formatWarrantyNumber(seq: number): string {
  return `WC${pad(seq)}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/reference.test.ts`
Expected: PASS, 9 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/reference.ts src/lib/jobs/reference.test.ts
git commit -m "feat: add job and document reference number formatting"
```

---

### Task 3: Totals and option resolution

This encodes the spec's central behavioural rule: RC188 totals because every unit resolves to one option; RC194 does not because its Study Cupboards unit still offers a choice.

**Files:**
- Create: `src/lib/jobs/totals.ts`
- Test: `src/lib/jobs/totals.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: types `SpecLine`, `UnitOption`, `JobUnit`, `JobMoney`, `JobTotals`, `DeliveryRow`; functions `resolvedOption(unit: JobUnit): UnitOption | null`, `isResolved(units: JobUnit[]): boolean`, `jobTotals(job: JobMoney): JobTotals | null`, `deliveryRow(job: JobMoney): DeliveryRow`

- [ ] **Step 1: Write the failing test**

Create `src/lib/jobs/totals.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deliveryRow, isResolved, jobTotals, resolvedOption } from './totals'
import type { JobMoney, JobUnit } from './totals'

function option(over: Partial<JobUnit['options'][number]> = {}) {
  return {
    id: 'opt-1',
    label: null,
    priceCents: 100_00,
    qty: 1,
    selected: false,
    specs: [],
    ...over,
  }
}

function unit(over: Partial<JobUnit> = {}): JobUnit {
  return { id: 'unit-1', title: 'Unit', options: [option()], ...over }
}

// The two real documents this design was built from.
const RC188: JobMoney = {
  units: [
    unit({ id: 'u1', title: 'Unite 01- Cupboards With Doors', options: [option({ id: 'a', priceCents: 235_000_00 })] }),
    unit({ id: 'u2', title: 'Unite 02- Cupboards Without Doors', options: [option({ id: 'b', priceCents: 148_000_00 })] }),
    unit({ id: 'u3', title: 'Table 01', options: [option({ id: 'c', priceCents: 24_500_00 })] }),
    unit({ id: 'u4', title: 'Table 02', options: [option({ id: 'd', priceCents: 22_500_00 })] }),
  ],
  discountCents: 30_000_00,
  freeDelivery: false,
  deliveryChargeCents: null,
}

const RC194: JobMoney = {
  units: [
    unit({ id: 'u1', title: 'Wardrobe with Dressing Unite', options: [option({ id: 'a', priceCents: 368_500_00 })] }),
    unit({
      id: 'u2',
      title: 'Study Cupboards',
      options: [
        option({ id: 'b', label: 'Option 01', priceCents: 182_500_00 }),
        option({ id: 'c', label: 'Option 02', priceCents: 257_000_00 }),
      ],
    }),
  ],
  discountCents: 0,
  freeDelivery: true,
  deliveryChargeCents: null,
}

describe('resolvedOption', () => {
  it('resolves a single-option unit implicitly, without it being marked selected', () => {
    const u = unit({ options: [option({ id: 'only', selected: false })] })
    expect(resolvedOption(u)?.id).toBe('only')
  })

  it('resolves a multi-option unit only once one is marked selected', () => {
    const u = unit({ options: [option({ id: 'a' }), option({ id: 'b' })] })
    expect(resolvedOption(u)).toBeNull()
    u.options[1].selected = true
    expect(resolvedOption(u)?.id).toBe('b')
  })

  it('returns null for a unit with no options at all', () => {
    expect(resolvedOption(unit({ options: [] }))).toBeNull()
  })
})

describe('isResolved', () => {
  it('is true for RC188, whose units all have a single option', () => {
    expect(isResolved(RC188.units)).toBe(true)
  })

  it('is false for RC194, whose Study Cupboards still offers a choice', () => {
    expect(isResolved(RC194.units)).toBe(false)
  })

  it('is false for a job with no units, which has nothing to total', () => {
    expect(isResolved([])).toBe(false)
  })
})

describe('jobTotals', () => {
  it('reproduces the RC188 totals block exactly', () => {
    const totals = jobTotals(RC188)
    expect(totals).not.toBeNull()
    expect(totals!.subtotalCents).toBe(430_000_00)
    expect(totals!.discountCents).toBe(30_000_00)
    expect(totals!.totalCents).toBe(400_000_00)
  })

  it('returns null for RC194, so the PDF omits the totals block', () => {
    expect(jobTotals(RC194)).toBeNull()
  })

  it('multiplies price by quantity', () => {
    const job: JobMoney = {
      units: [unit({ options: [option({ priceCents: 22_500_00, qty: 3 })] })],
      discountCents: 0,
      freeDelivery: true,
      deliveryChargeCents: null,
    }
    expect(jobTotals(job)!.subtotalCents).toBe(67_500_00)
  })

  it('adds a delivery charge to the total when delivery is not free', () => {
    const job: JobMoney = { ...RC188, discountCents: 0, freeDelivery: false, deliveryChargeCents: 5_000_00 }
    expect(jobTotals(job)!.totalCents).toBe(435_000_00)
  })

  it('ignores a stale delivery charge when free delivery is ticked', () => {
    const job: JobMoney = { ...RC188, discountCents: 0, freeDelivery: true, deliveryChargeCents: 5_000_00 }
    expect(jobTotals(job)!.deliveryCents).toBe(0)
    expect(jobTotals(job)!.totalCents).toBe(430_000_00)
  })

  it('totals a multi-option job once the customer has chosen', () => {
    const chosen: JobMoney = {
      ...RC194,
      units: RC194.units.map((u) =>
        u.id === 'u2' ? { ...u, options: u.options.map((o) => ({ ...o, selected: o.id === 'b' })) } : u,
      ),
    }
    expect(jobTotals(chosen)!.totalCents).toBe(551_000_00)
  })
})

describe('deliveryRow', () => {
  it('is free when the free-delivery box is ticked, as on RC194', () => {
    expect(deliveryRow(RC194)).toBe('free')
  })

  it('is charged when a delivery amount is entered', () => {
    expect(deliveryRow({ ...RC188, deliveryChargeCents: 5_000_00 })).toBe('charged')
  })

  it('is omitted when delivery is neither free nor charged, as on RC188', () => {
    expect(deliveryRow(RC188)).toBe('none')
  })

  it('is omitted when an explicit zero is entered rather than printing a 0.00 row', () => {
    expect(deliveryRow({ ...RC188, deliveryChargeCents: 0 })).toBe('none')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/totals.test.ts`
Expected: FAIL — `Failed to resolve import "./totals"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/jobs/totals.ts`:

```ts
// Pure money logic over a job's units. No database types here on purpose: the PDF
// renderer, the admin editor's live preview and the document snapshot all need these
// same rules, and only one of the three has rows from Drizzle in hand.

export interface SpecLine {
  /** Optional: RC188's "01 Soft closing drawer with 01 cupboard" has no label. */
  label: string | null
  value: string
}

export interface UnitOption {
  id: string
  /** Null on a single-option unit — nothing is printed above its spec lines. */
  label: string | null
  priceCents: number
  qty: number
  selected: boolean
  specs: SpecLine[]
}

export interface JobUnit {
  id: string
  title: string
  options: UnitOption[]
}

export interface JobMoney {
  units: JobUnit[]
  discountCents: number
  freeDelivery: boolean
  deliveryChargeCents: number | null
}

export interface JobTotals {
  subtotalCents: number
  discountCents: number
  deliveryCents: number
  totalCents: number
}

export type DeliveryRow = 'free' | 'charged' | 'none'

/** The option a unit currently stands for, or null while a choice is still open.
 *  A one-option unit is implicitly selected — that state is derived here rather than
 *  stored, so there is nothing to keep in sync when an option is added or removed. */
export function resolvedOption(unit: JobUnit): UnitOption | null {
  if (unit.options.length === 1) return unit.options[0]
  return unit.options.find((o) => o.selected) ?? null
}

/** True when every unit stands for exactly one option, so the job can be totalled.
 *  A job with no units is not resolved: there is nothing to total, and printing a
 *  0.00 total on an empty quotation would be worse than printing none. */
export function isResolved(units: JobUnit[]): boolean {
  return units.length > 0 && units.every((unit) => resolvedOption(unit) !== null)
}

/** Null while any choice is open — which is exactly why RC194 carries no totals block
 *  and RC188 does. Callers render the block only for a non-null result. */
export function jobTotals(job: JobMoney): JobTotals | null {
  if (!isResolved(job.units)) return null

  const subtotalCents = job.units.reduce((sum, unit) => {
    const option = resolvedOption(unit)
    return option ? sum + option.priceCents * option.qty : sum
  }, 0)

  // Free delivery wins over any amount left in the field, so unticking the box,
  // typing an amount and re-ticking it cannot silently charge the customer.
  const deliveryCents = job.freeDelivery ? 0 : (job.deliveryChargeCents ?? 0)

  return {
    subtotalCents,
    discountCents: job.discountCents,
    deliveryCents,
    totalCents: subtotalCents - job.discountCents + deliveryCents,
  }
}

/** Which of the three delivery behaviours applies. 'none' omits the row entirely,
 *  as RC188 does; a zero amount is treated as "not charging" rather than as a
 *  0.00 line, which no one would deliberately print. */
export function deliveryRow(job: JobMoney): DeliveryRow {
  if (job.freeDelivery) return 'free'
  if (job.deliveryChargeCents && job.deliveryChargeCents > 0) return 'charged'
  return 'none'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/totals.test.ts`
Expected: PASS, 16 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/totals.ts src/lib/jobs/totals.test.ts
git commit -m "feat: add job option resolution and totals rules"
```

---

### Task 4: Database schema and migration

**Files:**
- Modify: `src/db/schema.ts` (append; do not touch the existing three tables)
- Create: `src/db/migrations/0003_*.sql` (generated)
- Modify: `scripts/seed.ts`

**Interfaces:**
- Consumes: nothing
- Produces: Drizzle tables `customers`, `jobs`, `jobUnits`, `unitOptions`, `optionSpecs`, `jobClauses`, `clauseLibrary`, `specSnippets`, `jobDocuments`, `counters`

- [ ] **Step 1: Read the Drizzle indexes reference**

The partial unique index below is the one piece of this schema that `drizzle-kit generate` may emit incorrectly. Before writing it, confirm the `.where()` syntax for the installed version:

Run: `sed -n '1,80p' node_modules/drizzle-orm/pg-core/indexes.d.ts`

- [ ] **Step 2: Append the new tables to `src/db/schema.ts`**

Add to the existing imports at the top of the file:

```ts
import { bigint, boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
```

Append at the end of the file:

```ts
// ---------------------------------------------------------------------------
// Quotations and orders. See docs/superpowers/specs/2026-09-08-admin-quotations-orders-design.md
// ---------------------------------------------------------------------------

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  addressLines: text('address_lines').array(),
  city: text('city'),
  district: text('district'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// One row per job for its whole life. `stage` is commercial (has the customer
// committed?), `status` is production (is it being built?) — two genuinely
// independent axes, so they are two columns rather than one merged lifecycle enum.
// `advanceCents` is the advance *agreed* as a quotation term; money actually received
// is recorded in the payments table added in slice 2.
export const jobs = pgTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    ref: text('ref').notNull().unique(),
    // The raw counter value behind `ref`. Ordering by this stays correct if the
    // five-digit padding is ever outgrown; ordering by `ref` would not.
    refSeq: integer('ref_seq').notNull().unique(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    salesPerson: text('sales_person'),
    quotationDate: date('quotation_date').notNull(),
    estimationDate: date('estimation_date'),
    stage: text('stage').notNull().default('quotation'), // 'quotation' | 'order'
    status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'finished'
    freeDelivery: boolean('free_delivery').notNull().default(false),
    deliveryChargeCents: bigint('delivery_charge_cents', { mode: 'number' }),
    discountLabel: text('discount_label').notNull().default('Cash Discount'),
    discountCents: bigint('discount_cents', { mode: 'number' }).notNull().default(0),
    advanceCents: bigint('advance_cents', { mode: 'number' }),
    portalToken: text('portal_token').notNull().unique(),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('jobs_customer_idx').on(t.customerId)],
)

export const jobUnits = pgTable(
  'job_units',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
  },
  (t) => [index('job_units_job_idx').on(t.jobId)],
)

// The partial unique index is the structural guarantee behind "at most one option
// selected per unit" — enforced by Postgres rather than by application code that a
// future action could forget to run.
export const unitOptions = pgTable(
  'unit_options',
  {
    id: text('id').primaryKey(),
    unitId: text('unit_id')
      .notNull()
      .references(() => jobUnits.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    label: text('label'),
    priceCents: bigint('price_cents', { mode: 'number' }).notNull(),
    qty: integer('qty').notNull().default(1),
    selected: boolean('selected').notNull().default(false),
  },
  (t) => [
    index('unit_options_unit_idx').on(t.unitId),
    uniqueIndex('unit_options_one_selected').on(t.unitId).where(sql`${t.selected}`),
  ],
)

export const optionSpecs = pgTable(
  'option_specs',
  {
    id: text('id').primaryKey(),
    optionId: text('option_id')
      .notNull()
      .references(() => unitOptions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    label: text('label'),
    value: text('value').notNull(),
  },
  (t) => [index('option_specs_option_idx').on(t.optionId)],
)

// Reusable clause text. `kind` separates terms from warranty because they behave
// identically. `active` retires a clause from the picker without erasing it from the
// jobs that already copied it.
export const clauseLibrary = pgTable('clause_library', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(), // 'terms' | 'warranty'
  body: text('body').notNull(),
  emphasis: boolean('emphasis').notNull().default(false),
  position: integer('position').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// `body` is a COPY of the library text, never a reference. RC188 and RC194 carry
// different wording for the same clause ("15 to 30 days" vs "10 to 30 days"), so
// editing a clause for one customer must not rewrite every past quotation.
export const jobClauses = pgTable(
  'job_clauses',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'terms' | 'warranty'
    position: integer('position').notNull(),
    body: text('body').notNull(),
    emphasis: boolean('emphasis').notNull().default(false),
  },
  (t) => [index('job_clauses_job_idx').on(t.jobId)],
)

// Self-building library of specification-line text. Every job save upserts its lines
// here, so autocomplete gets better with use and needs no curation step.
export const specSnippets = pgTable(
  'spec_snippets',
  {
    id: text('id').primaryKey(),
    label: text('label'),
    value: text('value').notNull(),
    useCount: integer('use_count').notNull().default(1),
    lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('spec_snippets_text').on(t.label, t.value)],
)

// An issued document is immutable: `snapshot` holds the exact self-contained data it
// was rendered from, so it can be re-rendered years later even after the job and the
// customer record have moved on. Regenerating writes a new row rather than updating.
export const jobDocuments = pgTable(
  'job_documents',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'quotation' | 'advance_invoice' | 'final_invoice' | 'warranty_card'
    number: text('number').notNull(),
    blobUrl: text('blob_url').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    sentTo: text('sent_to'),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('job_documents_job_idx').on(t.jobId)],
)

// Single-statement atomic allocation:
//   UPDATE counters SET value = value + 1 WHERE key = '...' RETURNING value
export const counters = pgTable('counters', {
  key: text('key').primaryKey(),
  value: integer('value').notNull().default(0),
})
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new `src/db/migrations/0003_*.sql` and an updated `meta/_journal.json`

- [ ] **Step 4: Verify the partial index survived generation**

Run: `grep -n "unit_options_one_selected" src/db/migrations/0003_*.sql`

Expected output must contain `WHERE`:

```sql
CREATE UNIQUE INDEX "unit_options_one_selected" ON "unit_options" USING btree ("unit_id") WHERE "unit_options"."selected";
```

If the `WHERE` clause is missing, edit the generated SQL by hand to add it. Without it the "one selected option per unit" invariant is unenforced and the totals rule can be corrupted by a bug elsewhere.

- [ ] **Step 5: Seed the counters and the clause library**

Add to `scripts/seed.ts`, importing `JOB_REF_SEED` from `@/lib/jobs/reference` and `randomUUID` from `crypto`:

```ts
await db
  .insert(counters)
  .values([
    { key: 'job_ref', value: JOB_REF_SEED },
    { key: 'invoice', value: 0 },
    { key: 'warranty_card', value: 0 },
  ])
  .onConflictDoNothing()

// The six standard terms, transcribed from RC188/RC194. Clause 6 is bold on both
// documents. A new job pre-selects all of these, so the common case is zero clicks.
const STANDARD_TERMS = [
  'Manufacturing time - 15 to 30 days after the advance payment paid.',
  'This quotation is valid only for the design provided.',
  'Prices are valid for 20 days from the date stipulated on the estimate, due to the prevailing market conditions.',
  'Please confirm your acceptance of this quote by signing this document.',
  'Payment terms - Project start after 60% of advance payment. The remaining amount must be paid during installing the product.',
  '3 Years Warranty for Product. (only responsible for manufacturing defects)',
]

await db
  .insert(clauseLibrary)
  .values(
    STANDARD_TERMS.map((body, i) => ({
      id: randomUUID(),
      kind: 'terms' as const,
      body,
      emphasis: i === STANDARD_TERMS.length - 1,
      position: i,
      active: true,
    })),
  )
  .onConflictDoNothing()
```

- [ ] **Step 6: Apply the migration and seed**

Run: `npm run db:migrate && npm run db:seed`
Expected: migration applies cleanly; seed inserts three counters and six clauses

- [ ] **Step 7: Verify the invariant is actually enforced**

Run this against the database to confirm the partial index rejects a second selected option:

```bash
npx tsx --env-file=.env.local -e "
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
await sql\`INSERT INTO customers (id, name, phone) VALUES ('t-c', 'Test', '0000')\`
await sql\`INSERT INTO jobs (id, ref, ref_seq, customer_id, quotation_date, portal_token) VALUES ('t-j', 'RC99999', 99999, 't-c', '2026-01-01', 't-tok')\`
await sql\`INSERT INTO job_units (id, job_id, position, title) VALUES ('t-u', 't-j', 0, 'T')\`
await sql\`INSERT INTO unit_options (id, unit_id, position, price_cents, selected) VALUES ('t-o1', 't-u', 0, 100, true)\`
try {
  await sql\`INSERT INTO unit_options (id, unit_id, position, price_cents, selected) VALUES ('t-o2', 't-u', 1, 200, true)\`
  console.log('FAIL: second selected option was accepted')
} catch { console.log('PASS: partial unique index rejected the second selected option') }
await sql\`DELETE FROM customers WHERE id = 't-c'\`
"
```

Expected: `PASS: partial unique index rejected the second selected option`

Note the cleanup deletes the customer; the job and its children cascade. If the delete fails because `jobs.customer_id` is `onDelete: 'restrict'`, delete the job first.

- [ ] **Step 8: Stage and commit (after user review)**

```bash
git add src/db/schema.ts src/db/migrations scripts/seed.ts
git commit -m "feat: add quotation, unit, clause and document tables"
```

---

### Task 5: Form validation schemas

**Files:**
- Create: `src/lib/jobs/schema.ts`
- Test: `src/lib/jobs/schema.test.ts`

**Interfaces:**
- Consumes: `parseMoneyToCents` from `@/lib/money`
- Produces: `customerFormSchema`, `jobDetailsFormSchema`, `clauseFormSchema`, `jobUnitsSchema`, and the inferred types `CustomerFormInput`, `JobDetailsFormInput`, `ClauseFormInput`, `JobUnitsInput`; constants `JOB_STAGES`, `JOB_STATUSES`, `CLAUSE_KINDS`

- [ ] **Step 1: Write the failing test**

Create `src/lib/jobs/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { clauseFormSchema, customerFormSchema, jobDetailsFormSchema, jobUnitsSchema } from './schema'

const CUSTOMER = { name: 'Williams', phone: '+94 772383430', email: '', addressLines: 'Galapitamulla\nKurunegala.', city: '', district: '', notes: '' }

describe('customerFormSchema', () => {
  it('accepts a customer with only a name and phone', () => {
    expect(customerFormSchema.safeParse(CUSTOMER).success).toBe(true)
  })

  it('requires a name', () => {
    expect(customerFormSchema.safeParse({ ...CUSTOMER, name: '  ' }).success).toBe(false)
  })

  it('requires a phone number with enough digits to call back on', () => {
    expect(customerFormSchema.safeParse({ ...CUSTOMER, phone: '123' }).success).toBe(false)
  })

  it('splits address lines on newlines and drops blank ones', () => {
    const result = customerFormSchema.parse(CUSTOMER)
    expect(result.addressLines).toEqual(['Galapitamulla', 'Kurunegala.'])
  })

  it('turns a blank email into null rather than an empty string', () => {
    expect(customerFormSchema.parse(CUSTOMER).email).toBeNull()
  })

  it('rejects an email with no domain', () => {
    expect(customerFormSchema.safeParse({ ...CUSTOMER, email: 'nobody@' }).success).toBe(false)
  })
})

const DETAILS = {
  salesPerson: 'ISHAN',
  quotationDate: '2026-03-21',
  estimationDate: '',
  freeDelivery: 'on',
  deliveryCharge: '',
  discountLabel: 'Cash Discount',
  discount: '30,000.00',
  advance: '',
  status: 'pending',
  notes: '',
}

describe('jobDetailsFormSchema', () => {
  it('accepts the RC188 details', () => {
    expect(jobDetailsFormSchema.safeParse(DETAILS).success).toBe(true)
  })

  it('converts the discount to cents', () => {
    expect(jobDetailsFormSchema.parse(DETAILS).discountCents).toBe(3_000_000)
  })

  it('treats a blank discount as zero', () => {
    expect(jobDetailsFormSchema.parse({ ...DETAILS, discount: '' }).discountCents).toBe(0)
  })

  it('reads an unchecked free-delivery checkbox as false', () => {
    expect(jobDetailsFormSchema.parse({ ...DETAILS, freeDelivery: undefined }).freeDelivery).toBe(false)
  })

  it('nulls the delivery charge when free delivery is ticked, whatever the field holds', () => {
    const parsed = jobDetailsFormSchema.parse({ ...DETAILS, freeDelivery: 'on', deliveryCharge: '5000' })
    expect(parsed.deliveryChargeCents).toBeNull()
  })

  it('keeps the delivery charge when free delivery is unticked', () => {
    const parsed = jobDetailsFormSchema.parse({ ...DETAILS, freeDelivery: undefined, deliveryCharge: '5,000.00' })
    expect(parsed.deliveryChargeCents).toBe(500_000)
  })

  it('rejects a non-numeric discount', () => {
    expect(jobDetailsFormSchema.safeParse({ ...DETAILS, discount: 'lots' }).success).toBe(false)
  })

  it('requires a quotation date', () => {
    expect(jobDetailsFormSchema.safeParse({ ...DETAILS, quotationDate: '' }).success).toBe(false)
  })

  it('turns a blank estimation date into null', () => {
    expect(jobDetailsFormSchema.parse(DETAILS).estimationDate).toBeNull()
  })

  it('rejects an unknown status', () => {
    expect(jobDetailsFormSchema.safeParse({ ...DETAILS, status: 'shipped' }).success).toBe(false)
  })
})

describe('clauseFormSchema', () => {
  it('accepts a terms clause', () => {
    expect(clauseFormSchema.safeParse({ kind: 'terms', body: 'Manufacturing time - 15 to 30 days.', emphasis: undefined }).success).toBe(true)
  })

  it('rejects an unknown kind', () => {
    expect(clauseFormSchema.safeParse({ kind: 'shipping', body: 'x', emphasis: undefined }).success).toBe(false)
  })

  it('requires a non-empty body', () => {
    expect(clauseFormSchema.safeParse({ kind: 'terms', body: '   ', emphasis: undefined }).success).toBe(false)
  })

  it('reads the emphasis checkbox', () => {
    expect(clauseFormSchema.parse({ kind: 'terms', body: 'x', emphasis: 'on' }).emphasis).toBe(true)
  })
})

const UNITS_JSON = JSON.stringify([
  {
    title: 'Study Cupboards',
    options: [
      { label: 'Option 01', price: '182,500.00', qty: '1', selected: false, specs: [{ label: 'Size', value: 'L- 2780mm X H-2370mm X D-400mm' }] },
      { label: 'Option 02', price: '257,000.00', qty: '1', selected: false, specs: [{ label: null, value: 'Gloss finish doors' }] },
    ],
  },
])

describe('jobUnitsSchema', () => {
  it('accepts a unit with two priced options', () => {
    expect(jobUnitsSchema.safeParse(JSON.parse(UNITS_JSON)).success).toBe(true)
  })

  it('converts option prices to cents', () => {
    const parsed = jobUnitsSchema.parse(JSON.parse(UNITS_JSON))
    expect(parsed[0].options[0].priceCents).toBe(18_250_000)
  })

  it('requires a unit title', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].title = ''
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('requires every unit to have at least one option', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options = []
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('rejects a quantity below one', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options[0].qty = '0'
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('rejects two options selected on the same unit', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options[0].selected = true
    units[0].options[1].selected = true
    expect(jobUnitsSchema.safeParse(units).success).toBe(false)
  })

  it('drops a specification line with an empty value', () => {
    const units = JSON.parse(UNITS_JSON)
    units[0].options[0].specs.push({ label: 'Blank', value: '   ' })
    expect(jobUnitsSchema.parse(units)[0].options[0].specs).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/schema.test.ts`
Expected: FAIL — `Failed to resolve import "./schema"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/jobs/schema.ts`:

```ts
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

// An HTML checkbox submits 'on' when ticked and is absent entirely when not, so the
// field has to accept undefined rather than expecting a boolean.
const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.undefined(), z.literal('')])
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/schema.test.ts`
Expected: PASS, 28 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/schema.ts src/lib/jobs/schema.test.ts
git commit -m "feat: add job, customer and clause form validation"
```

---

### Task 6: Document snapshot builder

**Files:**
- Create: `src/lib/jobs/snapshot.ts`
- Test: `src/lib/jobs/snapshot.test.ts`

**Interfaces:**
- Consumes: `JobUnit`, `JobMoney`, `JobTotals`, `deliveryRow`, `jobTotals` from `./totals`; `formatCents` from `@/lib/money`
- Produces: type `QuotationSnapshot`; `buildQuotationSnapshot(input: SnapshotInput): QuotationSnapshot`

- [ ] **Step 1: Write the failing test**

Create `src/lib/jobs/snapshot.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildQuotationSnapshot } from './snapshot'
import type { SnapshotInput } from './snapshot'

const BASE: SnapshotInput = {
  ref: 'RC00188',
  quotationDate: '2026-03-21',
  salesPerson: 'ISHAN',
  customer: {
    name: 'williams',
    phone: '+94 772383430',
    email: null,
    addressLines: ['Galapitamulla', 'Kurunegala.'],
    city: null,
    district: null,
  },
  units: [
    {
      id: 'u1',
      title: 'Unite 01- Cupboards With Doors - W 2950mm x H 1980mm x D 485mm',
      options: [
        {
          id: 'o1',
          label: null,
          priceCents: 235_000_00,
          qty: 1,
          selected: false,
          specs: [{ label: 'Carcase', value: 'Fabrication of cupboards carcase made out with 18mm Melamine faced Heavier boards (Matt White).' }],
        },
      ],
    },
  ],
  discountLabel: 'Cash Discount',
  discountCents: 30_000_00,
  freeDelivery: false,
  deliveryChargeCents: null,
  terms: [{ body: 'Manufacturing time - 15 to 30 days after the advance payment paid.', emphasis: false }],
  warranty: [],
}

describe('buildQuotationSnapshot', () => {
  it('carries the reference and meta block through', () => {
    const snap = buildQuotationSnapshot(BASE)
    expect(snap.ref).toBe('RC00188')
    expect(snap.salesPerson).toBe('ISHAN')
  })

  it('flattens each unit to the single option it resolves to', () => {
    const snap = buildQuotationSnapshot(BASE)
    expect(snap.units[0].options).toHaveLength(1)
    expect(snap.units[0].options[0].priceLabel).toBe('235,000.00')
    expect(snap.units[0].options[0].totalLabel).toBe('235,000.00')
  })

  it('keeps both options and prints no totals while a choice is open', () => {
    const snap = buildQuotationSnapshot({
      ...BASE,
      discountCents: 0,
      units: [
        {
          id: 'u1',
          title: 'Study Cupboards',
          options: [
            { id: 'a', label: 'Option 01', priceCents: 182_500_00, qty: 1, selected: false, specs: [] },
            { id: 'b', label: 'Option 02', priceCents: 257_000_00, qty: 1, selected: false, specs: [] },
          ],
        },
      ],
    })
    expect(snap.units[0].options).toHaveLength(2)
    expect(snap.totals).toBeNull()
  })

  it('renders the RC188 totals block with formatted amounts', () => {
    const snap = buildQuotationSnapshot({
      ...BASE,
      units: [
        ...BASE.units,
        { id: 'u2', title: 'Table 01', options: [{ id: 'o2', label: null, priceCents: 195_000_00, qty: 1, selected: false, specs: [] }] },
      ],
    })
    expect(snap.totals).toEqual({
      subtotalLabel: '430,000.00',
      discountLabel: 'Cash Discount',
      discountAmountLabel: '30,000.00',
      totalLabel: '400,000.00',
    })
  })

  it('omits the discount row when there is no discount', () => {
    const snap = buildQuotationSnapshot({ ...BASE, discountCents: 0 })
    expect(snap.totals!.discountAmountLabel).toBeNull()
  })

  it('marks delivery as free when the box is ticked', () => {
    expect(buildQuotationSnapshot({ ...BASE, freeDelivery: true }).delivery).toEqual({ kind: 'free', amountLabel: null })
  })

  it('omits the delivery row when it is neither free nor charged', () => {
    expect(buildQuotationSnapshot(BASE).delivery).toEqual({ kind: 'none', amountLabel: null })
  })

  it('formats a charged delivery amount', () => {
    const snap = buildQuotationSnapshot({ ...BASE, freeDelivery: false, deliveryChargeCents: 5_000_00 })
    expect(snap.delivery).toEqual({ kind: 'charged', amountLabel: '5,000.00' })
  })

  it('is self-contained — no ids leak into the snapshot', () => {
    const json = JSON.stringify(buildQuotationSnapshot(BASE))
    expect(json).not.toContain('"id"')
  })

  it('survives a JSON round trip unchanged, since it is stored as jsonb', () => {
    const snap = buildQuotationSnapshot(BASE)
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: FAIL — `Failed to resolve import "./snapshot"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/jobs/snapshot.ts`:

```ts
import { formatCents } from '@/lib/money'
import { deliveryRow, jobTotals, resolvedOption } from './totals'
import type { JobUnit } from './totals'

// A snapshot is what a document was rendered from, frozen at the moment it was issued.
// It holds no ids and no foreign keys: everything the PDF needs is inlined, so a
// document can be re-rendered years later even after the job and the customer record
// have moved on. It is stored as jsonb, so every field here must survive JSON.
// Amounts are pre-formatted strings, not cents, so a future change to formatting can
// never retroactively alter a document a customer has already signed.

export interface SnapshotCustomer {
  name: string
  phone: string
  email: string | null
  addressLines: string[]
  city: string | null
  district: string | null
}

export interface SnapshotSpec {
  label: string | null
  value: string
}

export interface SnapshotOption {
  label: string | null
  priceLabel: string
  qtyLabel: string
  totalLabel: string
  specs: SnapshotSpec[]
}

export interface SnapshotUnit {
  title: string
  options: SnapshotOption[]
}

export interface SnapshotTotals {
  subtotalLabel: string
  discountLabel: string
  /** Null when there is no discount, so the row is omitted rather than showing 0.00. */
  discountAmountLabel: string | null
  totalLabel: string
}

export interface SnapshotDelivery {
  kind: 'free' | 'charged' | 'none'
  amountLabel: string | null
}

export interface SnapshotClause {
  body: string
  emphasis: boolean
}

export interface QuotationSnapshot {
  ref: string
  quotationDate: string
  salesPerson: string | null
  customer: SnapshotCustomer
  units: SnapshotUnit[]
  delivery: SnapshotDelivery
  totals: SnapshotTotals | null
  terms: SnapshotClause[]
  warranty: SnapshotClause[]
}

export interface SnapshotInput {
  ref: string
  quotationDate: string
  salesPerson: string | null
  customer: SnapshotCustomer
  units: JobUnit[]
  discountLabel: string
  discountCents: number
  freeDelivery: boolean
  deliveryChargeCents: number | null
  terms: SnapshotClause[]
  warranty: SnapshotClause[]
}

function snapshotOption(option: JobUnit['options'][number]): SnapshotOption {
  return {
    label: option.label,
    priceLabel: formatCents(option.priceCents),
    // Zero-padded to match the existing documents, which write "01" not "1".
    qtyLabel: String(option.qty).padStart(2, '0'),
    totalLabel: formatCents(option.priceCents * option.qty),
    specs: option.specs.map((spec) => ({ label: spec.label, value: spec.value })),
  }
}

export function buildQuotationSnapshot(input: SnapshotInput): QuotationSnapshot {
  const money = {
    units: input.units,
    discountCents: input.discountCents,
    freeDelivery: input.freeDelivery,
    deliveryChargeCents: input.deliveryChargeCents,
  }

  const totals = jobTotals(money)
  const delivery = deliveryRow(money)

  return {
    ref: input.ref,
    quotationDate: input.quotationDate,
    salesPerson: input.salesPerson,
    customer: input.customer,
    units: input.units.map((unit) => {
      // A resolved unit prints only the option it stands for; an unresolved one prints
      // every option so the customer can choose. This is the single place that
      // decision is made — the PDF renderer just draws what it is handed.
      const resolved = resolvedOption(unit)
      const options = resolved ? [resolved] : unit.options
      return { title: unit.title, options: options.map(snapshotOption) }
    }),
    delivery: {
      kind: delivery,
      amountLabel: delivery === 'charged' ? formatCents(input.deliveryChargeCents ?? 0) : null,
    },
    totals: totals
      ? {
          subtotalLabel: formatCents(totals.subtotalCents),
          discountLabel: input.discountLabel,
          discountAmountLabel: totals.discountCents > 0 ? formatCents(totals.discountCents) : null,
          totalLabel: formatCents(totals.totalCents),
        }
      : null,
    terms: input.terms,
    warranty: input.warranty,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: PASS, 10 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/snapshot.ts src/lib/jobs/snapshot.test.ts
git commit -m "feat: add immutable quotation document snapshots"
```

---

### Task 7: Clause library admin section

**Files:**
- Create: `src/app/admin/(protected)/clauses/page.tsx`
- Create: `src/app/admin/(protected)/clauses/actions.ts`
- Create: `src/app/admin/(protected)/clauses/ClauseForm.tsx`
- Create: `src/app/admin/(protected)/clauses/loading.tsx`
- Modify: `src/app/admin/(protected)/page.tsx` (add tile)

**Interfaces:**
- Consumes: `clauseFormSchema`, `CLAUSE_KINDS` from `@/lib/jobs/schema`; `clauseLibrary` from `@/db/schema`
- Produces: Server Actions `addClause`, `updateClause`, `deleteClause`, `toggleClauseActive`, `moveClause`; each takes `(prevState: ActionState, formData: FormData)` and returns `Promise<ActionState>`

- [ ] **Step 1: Read the Server Actions guide**

Run: `ls node_modules/next/dist/docs/01-app/03-api-reference/04-functions/ && sed -n '1,120p' node_modules/next/dist/docs/01-app/02-guides/*forms*.md 2>/dev/null | head -120`

Confirm the `useActionState` + Server Action form pattern for this version before writing the component. Cross-check against the working example in `src/app/admin/(protected)/testimonials/ManualTestimonialForm.tsx`.

- [ ] **Step 2: Write the actions**

Create `src/app/admin/(protected)/clauses/actions.ts`:

```ts
'use server'
import { randomUUID } from 'crypto'
import { and, asc, eq, gt, lt, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { clauseLibrary } from '@/db/schema'
import { clauseFormSchema, CLAUSE_KINDS } from '@/lib/jobs/schema'

export interface ActionState {
  error?: string
  success?: boolean
}

function revalidateClauses() {
  revalidatePath('/admin/clauses')
}

export async function addClause(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const parsed = clauseFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // Appended to the end of its own kind's list. max+1 rather than count, so a list
  // with a deleted row in the middle cannot produce a duplicate position.
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${clauseLibrary.position}), -1) + 1` })
    .from(clauseLibrary)
    .where(eq(clauseLibrary.kind, parsed.data.kind))

  await db.insert(clauseLibrary).values({
    id: randomUUID(),
    kind: parsed.data.kind,
    body: parsed.data.body,
    emphasis: parsed.data.emphasis,
    position: next,
    active: true,
  })

  revalidateClauses()
  return { success: true }
}

export async function updateClause(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const id = formData.get('id')
  if (typeof id !== 'string' || id === '') return { error: 'Missing clause id.' }

  const parsed = clauseFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  await db
    .update(clauseLibrary)
    .set({ body: parsed.data.body, emphasis: parsed.data.emphasis, updatedAt: new Date() })
    .where(eq(clauseLibrary.id, id))

  revalidateClauses()
  return { success: true }
}

/** Hard delete. Safe because job_clauses holds copied text, not a reference — no past
 *  quotation loses a clause when the library entry goes. */
export async function deleteClause(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const id = formData.get('id')
  if (typeof id !== 'string' || id === '') return { error: 'Missing clause id.' }

  await db.delete(clauseLibrary).where(eq(clauseLibrary.id, id))

  revalidateClauses()
  return { success: true }
}

export async function toggleClauseActive(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const id = formData.get('id')
  if (typeof id !== 'string' || id === '') return { error: 'Missing clause id.' }

  await db
    .update(clauseLibrary)
    .set({ active: sql`not ${clauseLibrary.active}`, updatedAt: new Date() })
    .where(eq(clauseLibrary.id, id))

  revalidateClauses()
  return { success: true }
}

/** Swaps a clause with its neighbour in the same kind. Two updates rather than a
 *  renumber of the whole list, so concurrent edits touch as little as possible. */
export async function moveClause(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const id = formData.get('id')
  const direction = formData.get('direction')
  if (typeof id !== 'string' || id === '') return { error: 'Missing clause id.' }
  if (direction !== 'up' && direction !== 'down') return { error: 'Invalid direction.' }

  const [current] = await db.select().from(clauseLibrary).where(eq(clauseLibrary.id, id))
  if (!current) return { error: 'Clause not found.' }

  const [neighbour] = await db
    .select()
    .from(clauseLibrary)
    .where(
      and(
        eq(clauseLibrary.kind, current.kind),
        direction === 'up'
          ? lt(clauseLibrary.position, current.position)
          : gt(clauseLibrary.position, current.position),
      ),
    )
    .orderBy(direction === 'up' ? sql`${clauseLibrary.position} desc` : asc(clauseLibrary.position))
    .limit(1)

  if (!neighbour) return { success: true } // already at the end; not an error

  await db.update(clauseLibrary).set({ position: neighbour.position }).where(eq(clauseLibrary.id, current.id))
  await db.update(clauseLibrary).set({ position: current.position }).where(eq(clauseLibrary.id, neighbour.id))

  revalidateClauses()
  return { success: true }
}

export async function listClauses(kind: (typeof CLAUSE_KINDS)[number]) {
  return db.select().from(clauseLibrary).where(eq(clauseLibrary.kind, kind)).orderBy(asc(clauseLibrary.position))
}
```

- [ ] **Step 3: Write the page and form**

Create `src/app/admin/(protected)/clauses/loading.tsx`:

```tsx
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen'

export default function Loading() {
  return <AdminLoadingScreen />
}
```

Create `src/app/admin/(protected)/clauses/ClauseForm.tsx` as a `'use client'` component using `useActionState(addClause, {})`, with a `<select name="kind">` over `CLAUSE_KINDS`, a `<textarea name="body">`, an `emphasis` checkbox, and `AdminSubmitButton`. Follow `ManualTestimonialForm.tsx` for the exact `useActionState` + reset-on-success shape.

Create `src/app/admin/(protected)/clauses/page.tsx` as an async Server Component that calls `listClauses('terms')` and `listClauses('warranty')`, renders each as a numbered list with per-row edit/delete/move/toggle forms, and renders `<ClauseForm />` under each list.

- [ ] **Step 4: Add the dashboard tile**

In `src/app/admin/(protected)/page.tsx`, append to `TILES`:

```ts
  {
    label: 'Terms & warranty',
    description: 'Reusable clauses offered on every quotation',
    href: '/admin/clauses',
  },
```

- [ ] **Step 5: Verify in the running app**

Run: `npm run dev`, sign in at `/admin`, open `/admin/clauses`.
Expected: the six seeded terms appear in order with clause 6 marked as emphasised. Add a warranty clause, reorder it, deactivate it, delete it — each round-trips without a page error.

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS, no new failures

- [ ] **Step 7: Stage and commit (after user review)**

```bash
git add "src/app/admin/(protected)/clauses" "src/app/admin/(protected)/page.tsx"
git commit -m "feat: add terms and warranty clause library"
```

---

### Task 8: Job creation, listing and deletion

**Files:**
- Create: `src/lib/jobs/queries.ts`
- Create: `src/app/admin/(protected)/jobs/actions.ts`
- Create: `src/app/admin/(protected)/jobs/page.tsx`
- Create: `src/app/admin/(protected)/jobs/loading.tsx`
- Create: `src/app/admin/(protected)/jobs/new/page.tsx`
- Create: `src/app/admin/(protected)/jobs/NewJobForm.tsx`
- Modify: `src/app/admin/(protected)/page.tsx` (add tile)

**Interfaces:**
- Consumes: `customerFormSchema` from `@/lib/jobs/schema`; `formatJobRef` from `@/lib/jobs/reference`; `jobTotals` from `@/lib/jobs/totals`
- Produces: `allocateRef(): Promise<{ seq: number; ref: string }>`, `loadJob(id: string)`, `listJobs()`; Server Actions `createJob`, `deleteJob`, `setJobStatus`

- [ ] **Step 1: Write the reference allocator and loaders**

Create `src/lib/jobs/queries.ts`:

```ts
import 'server-only'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { customers, jobClauses, jobUnits, jobs, optionSpecs, unitOptions } from '@/db/schema'
import { formatJobRef } from './reference'
import type { JobUnit } from './totals'

/** Allocates the next job reference. A single atomic UPDATE ... RETURNING, so two
 *  admins creating quotations at the same moment cannot be handed the same number. */
export async function allocateRef(): Promise<{ seq: number; ref: string }> {
  const rows = await db.execute<{ value: number }>(
    sql`update counters set value = value + 1 where key = 'job_ref' returning value`,
  )
  const seq = Number(rows.rows[0]?.value)
  if (!Number.isInteger(seq)) {
    throw new Error("Counter 'job_ref' is missing — run npm run db:seed")
  }
  return { seq, ref: formatJobRef(seq) }
}

export async function listJobs() {
  return db
    .select({
      id: jobs.id,
      ref: jobs.ref,
      refSeq: jobs.refSeq,
      quotationDate: jobs.quotationDate,
      stage: jobs.stage,
      status: jobs.status,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .orderBy(desc(jobs.refSeq))
}

/** Loads a job with its whole tree in three queries rather than one per unit. */
export async function loadJob(id: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .where(eq(jobs.id, id))
  if (!job) return null

  const unitRows = await db
    .select()
    .from(jobUnits)
    .leftJoin(unitOptions, eq(unitOptions.unitId, jobUnits.id))
    .leftJoin(optionSpecs, eq(optionSpecs.optionId, unitOptions.id))
    .where(eq(jobUnits.jobId, id))
    .orderBy(asc(jobUnits.position), asc(unitOptions.position), asc(optionSpecs.position))

  const clauses = await db.select().from(jobClauses).where(eq(jobClauses.jobId, id)).orderBy(asc(jobClauses.position))

  // Fold the flat join back into the nested shape totals.ts and snapshot.ts expect.
  const units: JobUnit[] = []
  const unitIndex = new Map<string, JobUnit>()
  const optionIndex = new Map<string, JobUnit['options'][number]>()

  for (const row of unitRows) {
    let unit = unitIndex.get(row.job_units.id)
    if (!unit) {
      unit = { id: row.job_units.id, title: row.job_units.title, options: [] }
      unitIndex.set(unit.id, unit)
      units.push(unit)
    }
    if (!row.unit_options) continue

    let option = optionIndex.get(row.unit_options.id)
    if (!option) {
      option = {
        id: row.unit_options.id,
        label: row.unit_options.label,
        priceCents: row.unit_options.priceCents,
        qty: row.unit_options.qty,
        selected: row.unit_options.selected,
        specs: [],
      }
      optionIndex.set(option.id, option)
      unit.options.push(option)
    }
    if (row.option_specs) {
      option.specs.push({ label: row.option_specs.label, value: row.option_specs.value })
    }
  }

  return {
    job: job.jobs,
    customer: job.customers,
    units,
    terms: clauses.filter((c) => c.kind === 'terms'),
    warranty: clauses.filter((c) => c.kind === 'warranty'),
  }
}
```

- [ ] **Step 2: Write the create/delete/status actions**

Create `src/app/admin/(protected)/jobs/actions.ts`. `createJob` must, in order:

1. `await verifyAdminSession()`
2. Parse the customer fields with `customerFormSchema`; return the first issue message on failure
3. Insert the customer with a `randomUUID()` id
4. `await allocateRef()`
5. Insert the job with that ref, `refSeq`, `stage: 'quotation'`, `status: 'pending'`, `quotationDate` defaulting to today, and `portalToken: randomBytes(32).toString('base64url')`
6. Copy every `active` clause from `clause_library` into `job_clauses`, preserving `position` and `emphasis`, for both kinds — this is the zero-click pre-selection
7. `revalidatePath('/admin/jobs')`
8. `redirect(\`/admin/jobs/${jobId}\`)`

`deleteJob` takes an id, calls `verifyAdminSession()`, deletes the job (children cascade), revalidates and redirects to `/admin/jobs`. `setJobStatus` validates the status against `JOB_STATUSES` and updates the single column.

- [ ] **Step 3: Write the list and new-job pages**

`src/app/admin/(protected)/jobs/page.tsx` renders `listJobs()` as a table of ref, customer, date, stage, status, with a "New quotation" link. `src/app/admin/(protected)/jobs/new/page.tsx` renders `NewJobForm`, a `'use client'` component collecting only the customer fields plus quotation date — everything else is added on the edit screen. Add `loading.tsx` using `AdminLoadingScreen`.

- [ ] **Step 4: Add the dashboard tile**

In `src/app/admin/(protected)/page.tsx`, append to `TILES`:

```ts
  {
    label: 'Quotations',
    description: 'Create, edit and send customer quotations',
    href: '/admin/jobs',
  },
```

- [ ] **Step 5: Verify in the running app**

Run: `npm run dev`, then create a job from `/admin/jobs/new`.
Expected: redirects to the edit page; the new job's ref is `RC00195`; creating a second gives `RC00196`; both appear in `/admin/jobs` newest first; the job already carries the six seeded terms.

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 7: Stage and commit (after user review)**

```bash
git add src/lib/jobs/queries.ts "src/app/admin/(protected)/jobs" "src/app/admin/(protected)/page.tsx"
git commit -m "feat: add job creation, listing and reference allocation"
```

---

### Task 9: Unit editor state

The editor holds a nested, reorderable structure. That logic is extracted into a pure reducer so it can be tested without rendering anything — the component in Task 10 is then a thin view over it.

**Files:**
- Create: `src/lib/jobs/unitEditor.ts`
- Test: `src/lib/jobs/unitEditor.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: types `DraftSpec`, `DraftOption`, `DraftUnit`, `EditorAction`; `emptyUnit(): DraftUnit`, `emptyOption(): DraftOption`, `unitEditorReducer(state: DraftUnit[], action: EditorAction): DraftUnit[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/jobs/unitEditor.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { emptyOption, emptyUnit, unitEditorReducer } from './unitEditor'
import type { DraftUnit } from './unitEditor'

function seed(): DraftUnit[] {
  return [{ ...emptyUnit(), key: 'u1', title: 'Study Cupboards' }]
}

describe('unitEditorReducer', () => {
  it('starts a new unit with exactly one option, per the always-one-option invariant', () => {
    expect(emptyUnit().options).toHaveLength(1)
  })

  it('adds a unit', () => {
    const next = unitEditorReducer(seed(), { type: 'addUnit' })
    expect(next).toHaveLength(2)
    expect(next[1].options).toHaveLength(1)
  })

  it('removes a unit', () => {
    expect(unitEditorReducer(seed(), { type: 'removeUnit', unitKey: 'u1' })).toHaveLength(0)
  })

  it('edits a unit title', () => {
    const next = unitEditorReducer(seed(), { type: 'setUnitTitle', unitKey: 'u1', title: 'Wardrobe' })
    expect(next[0].title).toBe('Wardrobe')
  })

  it('moves a unit up', () => {
    const two = unitEditorReducer(seed(), { type: 'addUnit' })
    const moved = unitEditorReducer(two, { type: 'moveUnit', unitKey: two[1].key, direction: 'up' })
    expect(moved[0].key).toBe(two[1].key)
  })

  it('leaves the order alone when moving the first unit up', () => {
    const state = seed()
    expect(unitEditorReducer(state, { type: 'moveUnit', unitKey: 'u1', direction: 'up' })[0].key).toBe('u1')
  })

  it('adds an option to a unit', () => {
    const next = unitEditorReducer(seed(), { type: 'addOption', unitKey: 'u1' })
    expect(next[0].options).toHaveLength(2)
  })

  it('refuses to remove the last option, keeping the invariant', () => {
    const next = unitEditorReducer(seed(), { type: 'removeOption', unitKey: 'u1', optionKey: seed()[0].options[0].key })
    expect(next[0].options).toHaveLength(1)
  })

  it('duplicates an option with all its specification lines', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'setSpec', unitKey: 'u1', optionKey, specIndex: 0, field: 'value', text: 'Jungle Teak doors' })
    state = unitEditorReducer(state, { type: 'duplicateOption', unitKey: 'u1', optionKey })
    expect(state[0].options).toHaveLength(2)
    expect(state[0].options[1].specs[0].value).toBe('Jungle Teak doors')
  })

  it('gives a duplicated option a distinct key so React can tell them apart', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'duplicateOption', unitKey: 'u1', optionKey })
    expect(state[0].options[0].key).not.toBe(state[0].options[1].key)
  })

  it('duplicates a whole unit', () => {
    let state = seed()
    state = unitEditorReducer(state, { type: 'duplicateUnit', unitKey: 'u1' })
    expect(state).toHaveLength(2)
    expect(state[1].title).toBe('Study Cupboards')
    expect(state[1].key).not.toBe('u1')
  })

  it('selecting an option clears the selection on its siblings', () => {
    let state = unitEditorReducer(seed(), { type: 'addOption', unitKey: 'u1' })
    state = unitEditorReducer(state, { type: 'selectOption', unitKey: 'u1', optionKey: state[0].options[0].key })
    state = unitEditorReducer(state, { type: 'selectOption', unitKey: 'u1', optionKey: state[0].options[1].key })
    expect(state[0].options.filter((o) => o.selected)).toHaveLength(1)
    expect(state[0].options[1].selected).toBe(true)
  })

  it('adds and removes specification lines', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'addSpec', unitKey: 'u1', optionKey })
    expect(state[0].options[0].specs).toHaveLength(2)
    state = unitEditorReducer(state, { type: 'removeSpec', unitKey: 'u1', optionKey, specIndex: 0 })
    expect(state[0].options[0].specs).toHaveLength(1)
  })

  it('moves a specification line down', () => {
    let state = seed()
    const optionKey = state[0].options[0].key
    state = unitEditorReducer(state, { type: 'setSpec', unitKey: 'u1', optionKey, specIndex: 0, field: 'value', text: 'first' })
    state = unitEditorReducer(state, { type: 'addSpec', unitKey: 'u1', optionKey })
    state = unitEditorReducer(state, { type: 'setSpec', unitKey: 'u1', optionKey, specIndex: 1, field: 'value', text: 'second' })
    state = unitEditorReducer(state, { type: 'moveSpec', unitKey: 'u1', optionKey, specIndex: 0, direction: 'down' })
    expect(state[0].options[0].specs[0].value).toBe('second')
  })

  it('never mutates the state it is given', () => {
    const state = seed()
    const frozen = JSON.stringify(state)
    unitEditorReducer(state, { type: 'setUnitTitle', unitKey: 'u1', title: 'Changed' })
    expect(JSON.stringify(state)).toBe(frozen)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/unitEditor.test.ts`
Expected: FAIL — `Failed to resolve import "./unitEditor"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/jobs/unitEditor.ts`. Every draft node carries a `key` (a `crypto.randomUUID()`) that is React's list key and the reducer's addressing handle — deliberately not the database id, because a draft row has no database id until it is saved.

```ts
export interface DraftSpec {
  label: string
  value: string
}

export interface DraftOption {
  key: string
  label: string
  price: string
  qty: string
  selected: boolean
  specs: DraftSpec[]
}

export interface DraftUnit {
  key: string
  title: string
  options: DraftOption[]
}

export type EditorAction =
  | { type: 'addUnit' }
  | { type: 'removeUnit'; unitKey: string }
  | { type: 'duplicateUnit'; unitKey: string }
  | { type: 'setUnitTitle'; unitKey: string; title: string }
  | { type: 'moveUnit'; unitKey: string; direction: 'up' | 'down' }
  | { type: 'addOption'; unitKey: string }
  | { type: 'removeOption'; unitKey: string; optionKey: string }
  | { type: 'duplicateOption'; unitKey: string; optionKey: string }
  | { type: 'selectOption'; unitKey: string; optionKey: string }
  | { type: 'setOptionField'; unitKey: string; optionKey: string; field: 'label' | 'price' | 'qty'; text: string }
  | { type: 'addSpec'; unitKey: string; optionKey: string }
  | { type: 'removeSpec'; unitKey: string; optionKey: string; specIndex: number }
  | { type: 'setSpec'; unitKey: string; optionKey: string; specIndex: number; field: 'label' | 'value'; text: string }
  | { type: 'moveSpec'; unitKey: string; optionKey: string; specIndex: number; direction: 'up' | 'down' }

function key(): string {
  return crypto.randomUUID()
}

export function emptyOption(): DraftOption {
  return { key: key(), label: '', price: '', qty: '1', selected: false, specs: [{ label: '', value: '' }] }
}

/** A new unit always starts with one option — the "every unit has at least one option"
 *  invariant from the spec, established at creation rather than patched at save. */
export function emptyUnit(): DraftUnit {
  return { key: key(), title: '', options: [emptyOption()] }
}

function move<T>(items: T[], index: number, direction: 'up' | 'down'): T[] {
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function mapUnit(state: DraftUnit[], unitKey: string, fn: (unit: DraftUnit) => DraftUnit): DraftUnit[] {
  return state.map((unit) => (unit.key === unitKey ? fn(unit) : unit))
}

function mapOption(unit: DraftUnit, optionKey: string, fn: (option: DraftOption) => DraftOption): DraftUnit {
  return { ...unit, options: unit.options.map((o) => (o.key === optionKey ? fn(o) : o)) }
}

export function unitEditorReducer(state: DraftUnit[], action: EditorAction): DraftUnit[] {
  switch (action.type) {
    case 'addUnit':
      return [...state, emptyUnit()]

    case 'removeUnit':
      return state.filter((u) => u.key !== action.unitKey)

    case 'duplicateUnit': {
      const index = state.findIndex((u) => u.key === action.unitKey)
      if (index === -1) return state
      const source = state[index]
      const copy: DraftUnit = {
        ...source,
        key: key(),
        options: source.options.map((o) => ({ ...o, key: key(), specs: o.specs.map((s) => ({ ...s })) })),
      }
      return [...state.slice(0, index + 1), copy, ...state.slice(index + 1)]
    }

    case 'setUnitTitle':
      return mapUnit(state, action.unitKey, (u) => ({ ...u, title: action.title }))

    case 'moveUnit':
      return move(state, state.findIndex((u) => u.key === action.unitKey), action.direction)

    case 'addOption':
      return mapUnit(state, action.unitKey, (u) => ({ ...u, options: [...u.options, emptyOption()] }))

    case 'removeOption':
      // Refused rather than allowed, so the invariant cannot be broken from the UI.
      return mapUnit(state, action.unitKey, (u) =>
        u.options.length <= 1 ? u : { ...u, options: u.options.filter((o) => o.key !== action.optionKey) },
      )

    case 'duplicateOption':
      // The RC194 case: Option 02 differs from Option 01 in four lines out of six, so
      // copying and editing beats retyping. This is why spec lines live on the option.
      return mapUnit(state, action.unitKey, (u) => {
        const index = u.options.findIndex((o) => o.key === action.optionKey)
        if (index === -1) return u
        const source = u.options[index]
        const copy: DraftOption = {
          ...source,
          key: key(),
          selected: false,
          specs: source.specs.map((s) => ({ ...s })),
        }
        return { ...u, options: [...u.options.slice(0, index + 1), copy, ...u.options.slice(index + 1)] }
      })

    case 'selectOption':
      // Mirrors the database's partial unique index: selecting one clears the rest.
      return mapUnit(state, action.unitKey, (u) => ({
        ...u,
        options: u.options.map((o) => ({ ...o, selected: o.key === action.optionKey })),
      }))

    case 'setOptionField':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, [action.field]: action.text })),
      )

    case 'addSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, specs: [...o.specs, { label: '', value: '' }] })),
      )

    case 'removeSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, specs: o.specs.filter((_, i) => i !== action.specIndex) })),
      )

    case 'setSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({
          ...o,
          specs: o.specs.map((s, i) => (i === action.specIndex ? { ...s, [action.field]: action.text } : s)),
        })),
      )

    case 'moveSpec':
      return mapUnit(state, action.unitKey, (u) =>
        mapOption(u, action.optionKey, (o) => ({ ...o, specs: move(o.specs, action.specIndex, action.direction) })),
      )
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/unitEditor.test.ts`
Expected: PASS, 16 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/unitEditor.ts src/lib/jobs/unitEditor.test.ts
git commit -m "feat: add unit editor reducer with duplicate and reorder"
```

---

### Task 10: Job edit screen

**Files:**
- Create: `src/app/admin/(protected)/jobs/[id]/page.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/loading.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/JobEditor.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/UnitFields.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/DeliveryFields.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/ClausePicker.tsx`
- Test: `src/app/admin/(protected)/jobs/[id]/DeliveryFields.test.tsx`
- Modify: `src/app/admin/(protected)/jobs/actions.ts` (add `saveJob`)

**Interfaces:**
- Consumes: `unitEditorReducer`, `emptyUnit` from `@/lib/jobs/unitEditor`; `jobDetailsFormSchema`, `jobUnitsSchema` from `@/lib/jobs/schema`; `loadJob` from `@/lib/jobs/queries`
- Produces: Server Action `saveJob(prevState: ActionState, formData: FormData): Promise<ActionState>`

- [ ] **Step 1: Read the dynamic route params guide**

In Next.js 16 `params` is a Promise. Confirm before writing the page:

Run: `grep -rn "params" node_modules/next/dist/docs/01-app/01-getting-started/*.md | head -20`

- [ ] **Step 2: Write the failing test for the delivery checkbox**

This is the one piece of interactive behaviour the user specified precisely, so it gets a test.

Create `src/app/admin/(protected)/jobs/[id]/DeliveryFields.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeliveryFields } from './DeliveryFields'

describe('DeliveryFields', () => {
  it('hides the amount field when free delivery is ticked', () => {
    render(<DeliveryFields freeDelivery deliveryCharge="" />)
    expect(screen.getByLabelText(/free delivery/i)).toBeChecked()
    expect(screen.queryByLabelText(/delivery charge/i)).not.toBeInTheDocument()
  })

  it('shows the amount field when free delivery is unticked', () => {
    render(<DeliveryFields freeDelivery={false} deliveryCharge="" />)
    expect(screen.getByLabelText(/delivery charge/i)).toBeInTheDocument()
  })

  it('reveals the amount field when the box is unticked by the user', async () => {
    const user = userEvent.setup()
    render(<DeliveryFields freeDelivery deliveryCharge="" />)
    await user.click(screen.getByLabelText(/free delivery/i))
    expect(screen.getByLabelText(/delivery charge/i)).toBeInTheDocument()
  })

  it('hides it again when the box is re-ticked', async () => {
    const user = userEvent.setup()
    render(<DeliveryFields freeDelivery={false} deliveryCharge="5000" />)
    await user.click(screen.getByLabelText(/free delivery/i))
    expect(screen.queryByLabelText(/delivery charge/i)).not.toBeInTheDocument()
  })

  it('keeps a previously entered amount when the field is hidden and shown again', async () => {
    const user = userEvent.setup()
    render(<DeliveryFields freeDelivery={false} deliveryCharge="5,000.00" />)
    await user.click(screen.getByLabelText(/free delivery/i))
    await user.click(screen.getByLabelText(/free delivery/i))
    expect(screen.getByLabelText(/delivery charge/i)).toHaveValue('5,000.00')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/jobs/[id]/DeliveryFields.test.tsx"`
Expected: FAIL — `Failed to resolve import "./DeliveryFields"`

- [ ] **Step 4: Write DeliveryFields**

Create `src/app/admin/(protected)/jobs/[id]/DeliveryFields.tsx`:

```tsx
'use client'
import { useState } from 'react'

/** The amount is kept mounted-or-not but its value is held here, so unticking,
 *  typing, re-ticking and unticking again does not lose what was typed. The server
 *  discards the amount whenever freeDelivery is set, so a stale value cannot leak
 *  into a total — see jobDetailsFormSchema. */
export function DeliveryFields({
  freeDelivery: initialFree,
  deliveryCharge: initialCharge,
}: {
  freeDelivery: boolean
  deliveryCharge: string
}) {
  const [free, setFree] = useState(initialFree)
  const [charge, setCharge] = useState(initialCharge)

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="freeDelivery"
          checked={free}
          onChange={(e) => setFree(e.target.checked)}
          className="size-4 accent-navy"
        />
        <span className="u-mono text-sm">Free delivery</span>
      </label>

      {free ? null : (
        <label className="block">
          <span className="u-mono text-sm opacity-70">Delivery charge</span>
          <input
            type="text"
            name="deliveryCharge"
            value={charge}
            onChange={(e) => setCharge(e.target.value)}
            inputMode="decimal"
            placeholder="5,000.00"
            className="mt-1 block w-full border-2 border-navy bg-paper px-3 py-2"
          />
        </label>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/jobs/[id]/DeliveryFields.test.tsx"`
Expected: PASS, 5 tests

- [ ] **Step 6: Write the remaining editor components**

`UnitFields.tsx` (`'use client'`) drives `unitEditorReducer` via `useReducer` and renders, per unit: a title input, add/remove/duplicate/move buttons, then per option a label, price, qty, a "selected" radio shown only when the unit has two or more options, and the specification-line rows with add/remove/move and a duplicate-option button. It serialises the whole draft array into a single `<input type="hidden" name="units">` on every change, which is what `jobUnitsSchema` parses.

`ClausePicker.tsx` (`'use client'`) shows the job's current clauses of one kind as editable textareas with an emphasis checkbox and a remove button, plus an "Add from library" list of the library clauses not already on the job. Serialises to a hidden `terms` / `warranty` JSON field.

`JobEditor.tsx` composes the customer fields, the details fields, `DeliveryFields`, `UnitFields` and two `ClausePicker`s into one `<form action={formAction}>` driven by `useActionState(saveJob, {})`, with a live totals preview computed by calling `jobTotals` on the draft.

`page.tsx` awaits `params`, calls `loadJob(id)`, calls `notFound()` when null, and renders `JobEditor` with the loaded data. `loading.tsx` renders `AdminLoadingScreen`.

- [ ] **Step 7: Write `saveJob`**

Append to `src/app/admin/(protected)/jobs/actions.ts`. It must, in order:

1. `await verifyAdminSession()`
2. Read and validate the job id
3. Parse the details with `jobDetailsFormSchema` and the customer with `customerFormSchema`
4. `JSON.parse` the `units` field inside a `try`, returning `{ error: 'Could not read the units.' }` on failure, then parse with `jobUnitsSchema`
5. Update the customer row and the job row
6. Replace the unit tree: `delete from job_units where job_id = ?` (options and specs cascade), then re-insert units, options and specs with `position` set from array index. Wholesale replacement rather than a diff — the tree is small, the code is a fraction of the size, and there is no id stability requirement across saves
7. Replace `job_clauses` the same way
8. Upsert every non-empty spec line into `spec_snippets` with `onConflictDoUpdate` incrementing `useCount` and setting `lastUsedAt`
9. `revalidatePath` both `/admin/jobs` and `/admin/jobs/${id}`, return `{ success: true }`

- [ ] **Step 8: Verify in the running app**

Run: `npm run dev`, then rebuild RC188 from the real document: four units, one option each, `Cash Discount` of `30,000.00`, free delivery unticked and blank.
Expected: the live preview shows `430,000.00 / 30,000.00 / 400,000.00`. Then add a second option to one unit and confirm the totals preview disappears until an option is selected.

- [ ] **Step 9: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 10: Stage and commit (after user review)**

```bash
git add "src/app/admin/(protected)/jobs"
git commit -m "feat: add job edit screen with units, options and clauses"
```

---

### Task 11: Specification-line autocomplete

**Files:**
- Create: `src/app/api/admin/spec-snippets/route.ts`
- Modify: `src/app/admin/(protected)/jobs/[id]/UnitFields.tsx`
- Create: `src/lib/jobs/snippetRank.ts`
- Test: `src/lib/jobs/snippetRank.test.ts`

**Interfaces:**
- Consumes: `specSnippets` from `@/db/schema`
- Produces: `rankSnippets(snippets: Snippet[], query: string, limit?: number): Snippet[]`; `GET /api/admin/spec-snippets?q=...` returning `{ snippets: Snippet[] }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/jobs/snippetRank.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rankSnippets } from './snippetRank'

const SNIPPETS = [
  { id: '1', label: 'Carcase', value: 'Fabrication of cupboards carcase made out with 18mm Melamine faced Heavier boards', useCount: 3 },
  { id: '2', label: 'Doors', value: 'Fabrication of cupboards Doors made out with 18mm Melamine faced Heavier boards', useCount: 8 },
  { id: '3', label: 'Door Mechanism', value: 'High Quality Branded Soft Closing Hinges', useCount: 5 },
  { id: '4', label: null, value: '01 Soft closing drawer with 01 cupboard', useCount: 1 },
]

describe('rankSnippets', () => {
  it('returns the most used first for an empty query', () => {
    expect(rankSnippets(SNIPPETS, '').map((s) => s.id)).toEqual(['2', '3', '1', '4'])
  })

  it('matches on the label', () => {
    expect(rankSnippets(SNIPPETS, 'carcase').map((s) => s.id)).toEqual(['1'])
  })

  it('matches on the value', () => {
    expect(rankSnippets(SNIPPETS, 'soft closing').map((s) => s.id)).toEqual(['3', '4'])
  })

  it('is case insensitive', () => {
    expect(rankSnippets(SNIPPETS, 'HINGES').map((s) => s.id)).toEqual(['3'])
  })

  it('ranks a label match above a value match', () => {
    expect(rankSnippets(SNIPPETS, 'door')[0].id).toBe('2')
  })

  it('tolerates a snippet with no label', () => {
    expect(rankSnippets(SNIPPETS, 'drawer').map((s) => s.id)).toEqual(['4'])
  })

  it('returns nothing for a query that matches nothing', () => {
    expect(rankSnippets(SNIPPETS, 'granite worktop')).toEqual([])
  })

  it('caps the result count', () => {
    expect(rankSnippets(SNIPPETS, '', 2)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/snippetRank.test.ts`
Expected: FAIL — `Failed to resolve import "./snippetRank"`

- [ ] **Step 3: Write the implementation**

Create `src/lib/jobs/snippetRank.ts`:

```ts
export interface Snippet {
  id: string
  label: string | null
  value: string
  useCount: number
}

const DEFAULT_LIMIT = 8

/** Ranks previously used specification lines for the autocomplete. Ordering is by
 *  match quality first, then by how often the line has been used — a line typed on
 *  eight past quotations is far more likely to be the one wanted than a one-off.
 *  Filtering in JS rather than SQL because the snippet table is small (hundreds of
 *  rows at most) and this keeps the ranking rule testable without a database. */
export function rankSnippets(snippets: Snippet[], query: string, limit = DEFAULT_LIMIT): Snippet[] {
  const q = query.trim().toLowerCase()

  const scored = snippets
    .map((snippet) => {
      if (q === '') return { snippet, rank: 0 }
      const label = (snippet.label ?? '').toLowerCase()
      if (label.includes(q)) return { snippet, rank: 0 }
      if (snippet.value.toLowerCase().includes(q)) return { snippet, rank: 1 }
      return null
    })
    .filter((entry) => entry !== null)

  scored.sort((a, b) => a.rank - b.rank || b.snippet.useCount - a.snippet.useCount)
  return scored.slice(0, limit).map((entry) => entry.snippet)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/snippetRank.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 5: Write the route handler**

Create `src/app/api/admin/spec-snippets/route.ts`. It calls `verifyAdminSession()` (this is an admin data path, and `src/proxy.ts` does not match `/api/*`), selects every snippet ordered by `useCount` desc with a `limit(500)`, passes them through `rankSnippets` with the `q` search param, and returns `Response.json({ snippets })`.

- [ ] **Step 6: Wire the autocomplete into UnitFields**

Add a datalist-backed or dropdown-backed suggestion to the spec label and value inputs, fetching from `/api/admin/spec-snippets?q=` on input with a short debounce. Selecting a suggestion fills both the label and the value in one action, since the pair is what repeats.

- [ ] **Step 7: Verify in the running app**

Run: `npm run dev`. Save a job containing `Door Mechanism / High Quality Branded Soft Closing Hinges`, then start a new job and type `door` into a spec label.
Expected: the saved line is suggested and selecting it fills both fields.

- [ ] **Step 8: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 9: Stage and commit (after user review)**

```bash
git add src/lib/jobs/snippetRank.ts src/lib/jobs/snippetRank.test.ts src/app/api/admin/spec-snippets "src/app/admin/(protected)/jobs/[id]/UnitFields.tsx"
git commit -m "feat: autocomplete specification lines from past quotations"
```

---

### Task 12: Quotation PDF

**Files:**
- Create: `src/pdf/QuotationDocument.tsx`
- Create: `src/pdf/styles.ts`
- Create: `src/pdf/Marker.tsx`
- Test: `src/pdf/QuotationDocument.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `QuotationSnapshot` from `@/lib/jobs/snapshot`
- Produces: `QuotationDocument({ snapshot }: { snapshot: QuotationSnapshot }): JSX.Element`, `renderQuotationPdf(snapshot: QuotationSnapshot): Promise<Buffer>`

- [ ] **Step 1: Install the PDF renderer**

Run: `npm install @react-pdf/renderer`
Expected: added to `dependencies`

- [ ] **Step 2: Write the failing test**

The PDF is asserted at the React element-tree level, not by rendering bytes — that keeps the test fast and makes failures readable.

Create `src/pdf/QuotationDocument.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { QuotationDocument } from './QuotationDocument'
import type { QuotationSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: QuotationSnapshot = {
  ref: 'RC00188',
  quotationDate: '21-March-2026',
  salesPerson: 'ISHAN',
  customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: ['Galapitamulla', 'Kurunegala.'], city: null, district: null },
  units: [
    {
      title: 'Unite 01- Cupboards With Doors',
      options: [{ label: null, priceLabel: '235,000.00', qtyLabel: '01', totalLabel: '235,000.00', specs: [{ label: 'Carcase', value: 'Fabrication of cupboards carcase' }] }],
    },
  ],
  delivery: { kind: 'none', amountLabel: null },
  totals: { subtotalLabel: '430,000.00', discountLabel: 'Cash Discount', discountAmountLabel: '30,000.00', totalLabel: '400,000.00' },
  terms: [{ body: 'Manufacturing time - 15 to 30 days after the advance payment paid.', emphasis: false }],
  warranty: [],
}

/** Collects every string in a React element tree, so assertions can be made about
 *  what the document says without rendering it to PDF bytes. */
function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('QuotationDocument', () => {
  it('prints the reference, date and sales person', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('RC00188')
    expect(text).toContain('21-March-2026')
    expect(text).toContain('ISHAN')
  })

  it('prints the customer block', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('williams')
    expect(text).toContain('Galapitamulla')
    expect(text).toContain('+94 772383430')
  })

  it('prints each unit with its specification lines and money columns', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Unite 01- Cupboards With Doors')
    expect(text).toContain('Carcase')
    expect(text).toContain('235,000.00')
    expect(text).toContain('01')
  })

  it('prints the totals block when the job resolves', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Cash Discount')
    expect(text).toContain('400,000.00')
  })

  it('omits the totals block entirely when a choice is still open', () => {
    const text = textOf(QuotationDocument({ snapshot: { ...SNAPSHOT, totals: null } }))
    expect(text).not.toContain('Cash Discount')
    expect(text).not.toContain('400,000.00')
  })

  it('omits the discount row when there is no discount', () => {
    const totals = { ...SNAPSHOT.totals!, discountAmountLabel: null }
    expect(textOf(QuotationDocument({ snapshot: { ...SNAPSHOT, totals } }))).not.toContain('Cash Discount')
  })

  it('prints the free-delivery row', () => {
    const text = textOf(QuotationDocument({ snapshot: { ...SNAPSHOT, delivery: { kind: 'free', amountLabel: null } } }))
    expect(text).toContain('Delivery Charges & Installation Charges For All Items')
    expect(text).toContain('Free')
  })

  it('omits the delivery row when it is neither free nor charged', () => {
    expect(textOf(QuotationDocument({ snapshot: SNAPSHOT }))).not.toContain('Delivery Charges')
  })

  it('prints option labels only when the unit offers a choice', () => {
    const withChoice: QuotationSnapshot = {
      ...SNAPSHOT,
      totals: null,
      units: [
        {
          title: 'Study Cupboards',
          options: [
            { label: 'Option 01', priceLabel: '182,500.00', qtyLabel: '01', totalLabel: '182,500.00', specs: [] },
            { label: 'Option 02', priceLabel: '257,000.00', qtyLabel: '01', totalLabel: '257,000.00', specs: [] },
          ],
        },
      ],
    }
    const text = textOf(QuotationDocument({ snapshot: withChoice }))
    expect(text).toContain('Option 01')
    expect(text).toContain('Option 02')
    expect(textOf(QuotationDocument({ snapshot: SNAPSHOT }))).not.toContain('Option 01')
  })

  it('prints the terms and the standing footer copy', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Manufacturing time - 15 to 30 days after the advance payment paid.')
    expect(text).toContain('Our Furniture Is Made From The Finest Quality Materials')
    expect(text).toContain("Client's Signature")
    expect(text).toContain('Thank You For Your Business!')
  })

  it('uses no unicode bullet glyphs, which the standard PDF fonts cannot render', () => {
    const text = textOf(QuotationDocument({ snapshot: SNAPSHOT }))
    expect(text).not.toContain('❖')
    expect(text).not.toContain('➢')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/pdf/QuotationDocument.test.tsx`
Expected: FAIL — `Failed to resolve import "./QuotationDocument"`

- [ ] **Step 4: Write the marker, styles and document**

Create `src/pdf/Marker.tsx`:

```tsx
import { Svg, Polygon } from '@react-pdf/renderer'

// The paper documents use ❖ (U+2756) for specification lines and ➢ (U+27A2) for
// option headings. Neither glyph exists in the standard PDF fonts, and embedded-font
// coverage for them is unpredictable — this is the classic "looks right locally,
// renders as □ in production" trap. Drawn as vector shapes, they cannot fail.

export function SpecMarker({ size = 5 }: { size?: number }) {
  const h = size / 2
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={`${h},0 ${size},${h} ${h},${size} 0,${h}`} fill="#000" />
    </Svg>
  )
}

export function OptionMarker({ size = 6 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={`0,0 ${size},${size / 2} 0,${size}`} fill="#000" />
    </Svg>
  )
}
```

Create `src/pdf/styles.ts` holding a `StyleSheet.create` of the page, header, table, totals, terms and signature styles, with the table column widths matching the paper document: description flexible, price/qty/total fixed.

Create `src/pdf/QuotationDocument.tsx` rendering, in order: the company block and `QUOTATION` title, the client details block, the `DATE / QUOTATION / SALES PERSON` meta block, the `DESCRIPTION | PRICE | QTY/UNITS | TOTAL` table (option labels rendered only when `options.length > 1`), the delivery row when `delivery.kind !== 'none'`, the totals block when `totals !== null` with the discount row only when `discountAmountLabel !== null`, the `Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard` tagline, `Terms & Conditions` numbered with `emphasis` clauses bold, the warranty clauses when present, the two-column `Thanking you / Roomy Creations` and `Approved by Client / Client's Signature` signature block, and `Thank You For Your Business!` in red italic.

Also export from the same file:

```ts
import { renderToBuffer } from '@react-pdf/renderer'

export async function renderQuotationPdf(snapshot: QuotationSnapshot): Promise<Buffer> {
  return renderToBuffer(<QuotationDocument snapshot={snapshot} />)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/pdf/QuotationDocument.test.tsx`
Expected: PASS, 12 tests

- [ ] **Step 6: Eyeball a real PDF**

The element-tree test proves the content is right; only a human eye proves the layout is. Write a throwaway script that renders the RC188 snapshot to `/tmp/rc188.pdf` and open it.

Expected: side by side with `Quotation RC188 Williams -.pdf`, the header, table, totals, terms and signature block line up, and the diamond and arrow markers render as shapes rather than boxes. Delete the script afterwards.

- [ ] **Step 7: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 8: Stage and commit (after user review)**

```bash
git add src/pdf package.json package-lock.json
git commit -m "feat: render quotation PDFs matching the existing document"
```

---

### Task 13: Generate, store, download and email the quotation

**Files:**
- Create: `src/lib/jobs/mail.ts`
- Create: `src/app/admin/(protected)/jobs/[id]/documents/page.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/documents/loading.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/documents/actions.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `loadJob` from `@/lib/jobs/queries`; `buildQuotationSnapshot` from `@/lib/jobs/snapshot`; `renderQuotationPdf` from `@/pdf/QuotationDocument`
- Produces: Server Actions `generateQuotationPdf`, `emailQuotation`; `sendDocumentEmail(args): Promise<{ error?: string }>`

- [ ] **Step 1: Add the environment variable**

Append to `.env.example`:

```
# Verified sender address quotation, invoice and warranty documents are sent from
# (must be a domain verified in Resend). Kept separate from ENQUIRY_FROM_EMAIL so
# customer documents and inbound enquiries can use different addresses.
DOCS_FROM_EMAIL=
```

Set a real value in `.env.local`.

- [ ] **Step 2: Write the mail helper**

Create `src/lib/jobs/mail.ts`. Following the rule already established in `src/app/api/enquiry/route.ts`, every missing configuration value is checked **before** attempting delivery and returns an error — a document that was not sent must never be reported as sent:

```ts
import 'server-only'
import { Resend } from 'resend'

export interface DocumentEmail {
  to: string
  subject: string
  body: string
  filename: string
  pdf: Buffer
}

export async function sendDocumentEmail(email: DocumentEmail): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.DOCS_FROM_EMAIL

  if (!apiKey) {
    console.error('Document email misconfigured: RESEND_API_KEY is not set')
    return { error: 'Email is not configured — set RESEND_API_KEY.' }
  }
  if (!from) {
    console.error('Document email misconfigured: DOCS_FROM_EMAIL is not set')
    return { error: 'Email is not configured — set DOCS_FROM_EMAIL.' }
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: [email.to],
    subject: email.subject,
    text: email.body,
    attachments: [{ filename: email.filename, content: email.pdf }],
  })

  if (error) {
    console.error('Document email failed', error)
    return { error: 'The email could not be sent. The PDF is still available to download.' }
  }
  return {}
}
```

- [ ] **Step 3: Write the document actions**

Create `src/app/admin/(protected)/jobs/[id]/documents/actions.ts`.

`generateQuotationPdf` must: `verifyAdminSession()`; `loadJob(id)`, returning an error when null; refuse with a readable message when the job has no units; build the snapshot; render the PDF; `put()` it to Blob at `quotations/${ref}-${Date.now()}.pdf` with `access: 'public'`; insert a `job_documents` row with `kind: 'quotation'`, `number: job.ref`, the blob URL and the snapshot; revalidate; return `{ success: true }`.

`emailQuotation` must: `verifyAdminSession()`; load the document row by id; return a readable error when the customer has no email address; fetch the stored PDF from its blob URL rather than re-rendering, so the customer receives byte-for-byte what the admin downloaded and reviewed; call `sendDocumentEmail`; on success set `sentTo` and `sentAt`; return `{ error }` unchanged on failure so the admin sees it.

- [ ] **Step 4: Write the documents page**

Create the page listing every `job_documents` row for the job newest first, each with its number, kind, creation time, sent-to and sent-at, a download link to the blob URL, and a "Send by email" button. Above the list, a "Generate quotation PDF" button. Add `loading.tsx` using `AdminLoadingScreen`. Link to this page from the job edit screen.

- [ ] **Step 5: Verify end to end in the running app**

Run: `npm run dev`. On the RC188 job created in Task 10, generate the PDF, download it, then send it to your own address.

Expected: the download matches the original document; the email arrives with the PDF attached; the row shows the address and time it was sent. Then set `DOCS_FROM_EMAIL=` empty, restart, and try again — expect a visible error and **no** success state, and confirm no `sentAt` was written.

- [ ] **Step 6: Document the new section**

Add a section to `README.md` covering the Quotations and Terms & warranty admin sections, the `DOCS_FROM_EMAIL` variable, and the fact that `npm run db:seed` seeds the reference counter at 194 and the six standard terms. Follow the structure of the existing admin portal documentation.

- [ ] **Step 7: Run the full suite, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: PASS — the build is included here because `@react-pdf/renderer` is the first dependency in this project that must bundle for the server runtime.

- [ ] **Step 8: Stage and commit (after user review)**

```bash
git add src/lib/jobs/mail.ts "src/app/admin/(protected)/jobs/[id]/documents" .env.example README.md
git commit -m "feat: generate, store, download and email quotation PDFs"
```

---

## Self-Review

**Spec coverage.** Walking the spec section by section: "Core decision" → Task 4 (`stage`/`status` columns); "Units, options and specification lines" → Tasks 3, 4, 9, 10; "The totals rule" → Task 3, enforced again in Tasks 6 and 12; "Money" → Task 1; "Delivery" → Tasks 3, 5, 10; "Job reference numbers" → Tasks 2, 8; "Schema" → Task 4; "Clause libraries" → Tasks 4 (seed), 7 (library), 8 (pre-selection), 10 (per-job editing); "Making data entry fast" → Tasks 9 (duplicate) and 11 (autocomplete); "PDF generation" → Task 12; "Documents are immutable snapshots" → Tasks 6, 13; "Email delivery" → Task 13; "Admin routes" → Tasks 7, 8, 10, 13; "Module boundaries" → matches the file layout throughout; "Testing" → every pure module has a test task; "Environment" → Task 13.

Deliberately **not** covered here, and deferred to their own plans: the customer portal and 3D art (spec §"Customer portal", slice 3), payments and the order stage (slice 2), invoices and warranty cards (slice 4). The `portalToken` column and the `advance_cents` column are created in Task 4 so slices 2 and 3 need no migration to the `jobs` table.

**Type consistency.** `JobUnit`/`UnitOption`/`SpecLine` are defined once in `totals.ts` and consumed unchanged by `snapshot.ts` (Task 6) and `queries.ts` (Task 8). The editor's `DraftUnit`/`DraftOption` are deliberately separate types — they hold unparsed strings — and are converted at the schema boundary by `jobUnitsSchema` (Task 5). `QuotationSnapshot` is defined in Task 6 and consumed in Tasks 12 and 13. `ActionState` is redeclared per actions file, matching the existing convention in `site-details/actions.ts` and `testimonials/actions.ts`.
