# Admin Orders (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add payments, a manual quotation→order stage advance, an order confirmation document, and a minimal payment receipt document to the quotations system built in Slice 1.

**Architecture:** A new `payments` table holds one row per payment against a job. Pure logic (`paidTotalCents`, `paymentPosition`) computes what's paid and owed and lives in `src/lib/jobs/payments.ts`, composing with Slice 1's `jobTotals`/`resolvedOption` the same way those already compose with each other. The order and receipt documents reuse Slice 1's PDF building blocks, extracted from `QuotationDocument.tsx` into `src/pdf/blocks.tsx` for this purpose. `jobs.stage` (already a column, unused until now) flips from `'quotation'` to `'order'` only via an explicit admin action, never automatically.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19.2, Drizzle ORM 0.45 on Neon Postgres, Zod 4.4, Tailwind 4, Vercel Blob, Resend, Vitest + Testing Library, `@react-pdf/renderer`.

**Spec:** `docs/superpowers/specs/2026-09-19-admin-orders-slice-2-design.md` (and, for anything it doesn't override, `docs/superpowers/specs/2026-09-08-admin-quotations-orders-design.md`)

## Global Constraints

- **This is Next.js 16.2.12, not the Next.js you know.** Read the relevant guide in `node_modules/next/dist/docs/` before writing route handlers, Server Actions, `loading.tsx` or metadata. Per `AGENTS.md` this is mandatory, not advisory.
- **Review gate.** After completing each task, stop and ask the user to review before proceeding. Do not `git commit` and do not create or edit any markdown file until the user has explicitly confirmed after their own review. The "Commit" step in each task below means *stage and prepare*; run it only once the user confirms.
- **Money is integer cents**, stored as `bigint('...', { mode: 'number' })`. Never floats, never `numeric`.
- **`jobs.stage` never changes automatically.** Recording a payment must never itself flip `stage` — only the explicit Confirm-order action does. This reverses the original spec's "automatic on advance" model; see the Slice 2 spec's Decisions section.
- **A job cannot become `stage: 'order'` while any unit is unresolved** (`jobTotals(units) === null`). Enforced server-side in the action, not only in the UI.
- **Documents are immutable snapshots.** Generating an order document or a receipt always inserts a new `job_documents` row; nothing already issued is ever rewritten.
- **Enumerated values are `text` columns** validated by Zod, not Postgres enums — matching `jobs.status`/`stage` and `job_documents.kind`.
- **Every admin page** lives under `src/app/admin/(protected)/`, whose layout calls `verifyAdminSession()`. **Every Server Action calls `verifyAdminSession()` itself**, because an action is a separate entry point the layout does not cover.
- **Server Action shape** follows the existing convention: `export interface ActionState { error?: string; success?: boolean }`, `safeParse(Object.fromEntries(formData))`, `return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }`. A plain `(formData: FormData): Promise<void>` action (no per-field feedback) is used where Slice 1 already established that pattern (`setJobStatus`, `deleteJob`).
- **Currency is LKR**, rendered without a symbol as `368,500.00`, via `formatCents`/`parseMoneyToCents` from `@/lib/money`.
- **Tests** import `{ describe, it, expect }` from `vitest` explicitly even though `globals: true`, matching every existing test file.
- **Styling** follows the existing admin pages: `border-2 border-navy bg-paper text-navy`, `font-display` for headings, `u-mono` for secondary text, `rounded-full` buttons.
- **No server action in this codebase has its own `.test.ts`.** Actions and pages that touch the database are verified live against the running dev server (`npm run dev`), never inside `vitest` — the project's standing rule. Only pure logic, Zod schemas, and PDF document-tree assertions get automated tests.

---

### Task 1: Payment position logic and receipt numbering

Two small, independent pure-logic additions bundled into one task since neither is worth its own review cycle alone.

**Files:**
- Create: `src/lib/jobs/payments.ts`
- Test: `src/lib/jobs/payments.test.ts`
- Modify: `src/lib/jobs/reference.ts`
- Modify: `src/lib/jobs/reference.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `paidTotalCents(payments: { amountCents: number }[]): number`, `paymentPosition(totalCents: number | null, payments: { amountCents: number }[]): { paidCents: number; balanceCents: number } | null`, `DEFAULT_PAYMENT_TERMS: string`; `formatReceiptNumber(seq: number): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jobs/payments.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_PAYMENT_TERMS, paidTotalCents, paymentPosition } from './payments'

describe('paidTotalCents', () => {
  it('sums every payment', () => {
    expect(paidTotalCents([{ amountCents: 150_000_00 }, { amountCents: 50_000_00 }])).toBe(200_000_00)
  })

  it('is zero when there are no payments', () => {
    expect(paidTotalCents([])).toBe(0)
  })
})

describe('paymentPosition', () => {
  it('is null when the job has no total yet — an unresolved choice cannot have a balance', () => {
    expect(paymentPosition(null, [{ amountCents: 150_000_00 }])).toBeNull()
  })

  it('is null even when no payments have been made against an unresolved job', () => {
    expect(paymentPosition(null, [])).toBeNull()
  })

  it('computes paid and balance against the total', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 150_000_00 }])).toEqual({
      paidCents: 150_000_00,
      balanceCents: 200_000_00,
    })
  })

  it('is a full balance when nothing has been paid', () => {
    expect(paymentPosition(350_000_00, [])).toEqual({ paidCents: 0, balanceCents: 350_000_00 })
  })

  it('sums multiple payments before computing the balance', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 150_000_00 }, { amountCents: 100_000_00 }])).toEqual({
      paidCents: 250_000_00,
      balanceCents: 100_000_00,
    })
  })

  it('allows a balance of zero when paid in full', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 350_000_00 }])).toEqual({
      paidCents: 350_000_00,
      balanceCents: 0,
    })
  })

  it('allows a negative balance when overpaid, rather than clamping', () => {
    expect(paymentPosition(350_000_00, [{ amountCents: 400_000_00 }])).toEqual({
      paidCents: 400_000_00,
      balanceCents: -50_000_00,
    })
  })
})

describe('DEFAULT_PAYMENT_TERMS', () => {
  it('is a non-empty sentence', () => {
    expect(DEFAULT_PAYMENT_TERMS.length).toBeGreaterThan(0)
  })
})
```

Add to `src/lib/jobs/reference.test.ts`, inside the existing `describe('other document series', ...)` block:

```ts
  it('formats receipt numbers on their own series', () => {
    expect(formatReceiptNumber(1)).toBe('RCP00001')
  })
```

And update its import line to add `formatReceiptNumber`:

```ts
import { formatInvoiceNumber, formatJobRef, formatReceiptNumber, formatWarrantyNumber, JOB_REF_SEED } from './reference'
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/jobs/payments.test.ts src/lib/jobs/reference.test.ts`
Expected: FAIL — `Failed to resolve import "./payments"` and `formatReceiptNumber is not a function`

- [ ] **Step 3: Write the implementations**

Create `src/lib/jobs/payments.ts`:

```ts
// Pure money logic over a job's payments — the Slice 2 counterpart to totals.ts.
// Composes with jobTotals the same way jobTotals composes with resolvedOption: each
// stage refuses to produce a number until its input is complete.

export interface Payment {
  amountCents: number
}

export interface PaymentPosition {
  paidCents: number
  balanceCents: number
}

export function paidTotalCents(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amountCents, 0)
}

/** Null whenever the job itself has no total yet (jobTotals returned null because a
 *  unit is still unresolved) — a balance can never be computed or printed against a
 *  price that isn't settled. Not clamped to zero: an overpayment is a real balance a
 *  refund would need to correct, and hiding it would hide a bookkeeping problem. */
export function paymentPosition(totalCents: number | null, payments: Payment[]): PaymentPosition | null {
  if (totalCents === null) return null
  const paidCents = paidTotalCents(payments)
  return { paidCents, balanceCents: totalCents - paidCents }
}

/** Printed on the order document under the Advance Paid / Balance Due rows when a
 *  job carries no job-specific payment_terms of its own. */
export const DEFAULT_PAYMENT_TERMS = 'Balance payable on completion of installation.'
```

Add to `src/lib/jobs/reference.ts`, after `formatWarrantyNumber`:

```ts
export function formatReceiptNumber(seq: number): string {
  return `RCP${pad(seq)}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/jobs/payments.test.ts src/lib/jobs/reference.test.ts`
Expected: PASS, 8 tests in `payments.test.ts`, 10 tests in `reference.test.ts`

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/payments.ts src/lib/jobs/payments.test.ts src/lib/jobs/reference.ts src/lib/jobs/reference.test.ts
git commit -m "feat: add payment position logic and receipt numbering"
```

---

### Task 2: Database schema and migration

**Files:**
- Modify: `src/db/schema.ts` (append `payments`; add three columns to existing tables)
- Create: `src/db/migrations/0004_*.sql` (generated)
- Modify: `scripts/seed.ts`

**Interfaces:**
- Consumes: nothing
- Produces: Drizzle table `payments`; new columns `jobs.paymentTerms`, `jobs.confirmedAt`, `jobDocuments.paymentId`

- [ ] **Step 1: Add the three new columns to existing tables in `src/db/schema.ts`**

In the `jobs` table definition, add two columns after `advanceCents` (which stays as the *agreed* advance — these are new, not replacements):

```ts
    advanceCents: bigint('advance_cents', { mode: 'number' }),
    // The order document's editable terms sentence (e.g. "Balance payable on
    // completion of installation."). Null falls back to DEFAULT_PAYMENT_TERMS at
    // render time, so no backfill is needed for jobs created before this column existed.
    paymentTerms: text('payment_terms'),
    // Set once, by the Confirm order action — separate from quotationDate because the
    // order document needs its own date, not the quotation's.
    confirmedAt: timestamp('confirmed_at'),
    portalToken: text('portal_token').notNull().unique(),
```

In the `jobDocuments` table definition, add one column after `snapshot`:

```ts
    snapshot: jsonb('snapshot').notNull(),
    // Which payment a 'receipt' document was issued for. Nullable and ON DELETE SET
    // NULL, not CASCADE: deleting the payment must never delete the receipt already
    // handed to the customer — the receipt's snapshot is self-contained regardless.
    paymentId: text('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    sentTo: text('sent_to'),
```

Also update the `kind` comment on that same table to reflect the two new values:

```ts
    kind: text('kind').notNull(), // 'quotation' | 'order' | 'receipt' | 'advance_invoice' | 'final_invoice' | 'warranty_card'
```

- [ ] **Step 2: Append the `payments` table**

Add at the end of `src/db/schema.ts`, before `counters` (so `payments` is defined ahead of `jobDocuments`'s reference to it — Drizzle table definitions in one file can reference each other regardless of declaration order via the `() => payments.id` thunk, but keeping `payments` above `jobDocuments` in the file matches how `unitOptions` is declared above `optionSpecs`, which also references it):

```ts
// One row per payment against a job. `kind` is free enough to record an ad-hoc
// payment ('other') without forcing it into 'advance' or 'final'. `method` is free
// text with UI suggestions rather than an enum, matching how jobs.salesPerson already
// works — there is no fixed vocabulary worth enforcing in the database.
export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'advance' | 'final' | 'other'
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    paidAt: date('paid_at').notNull(),
    method: text('method'),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('payments_job_idx').on(t.jobId)],
)
```

Note `payments` must be declared *before* `jobDocuments` in the file (move the `jobDocuments` table below this block if it currently sits above where you added `payments`), since `jobDocuments.paymentId`'s `.references(() => payments.id, ...)` needs `payments` to already be an in-scope identifier — the arrow-function thunk defers evaluation, but the binding itself must exist at that point in the module.

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new `src/db/migrations/0004_*.sql` and an updated `meta/_journal.json`

- [ ] **Step 4: Verify the generated SQL**

Run: `cat src/db/migrations/0004_*.sql`

Expected to contain a `CREATE TABLE "payments"` block, `ALTER TABLE "jobs" ADD COLUMN "payment_terms" text` and `ADD COLUMN "confirmed_at" timestamp`, `ALTER TABLE "job_documents" ADD COLUMN "payment_id" text`, a foreign key `job_documents_payment_id_payments_id_fk` with `ON DELETE set null`, a foreign key `payments_job_id_jobs_id_fk` with `ON DELETE cascade`, and `CREATE INDEX "payments_job_idx"`. No `DROP` statements should appear anywhere in the file — this migration only adds.

- [ ] **Step 5: Seed the receipt counter**

In `scripts/seed.ts`, add `'receipt'` to the `seedCounters` function's values array:

```ts
async function seedCounters() {
  await db
    .insert(counters)
    .values([
      { key: 'job_ref', value: JOB_REF_SEED },
      { key: 'invoice', value: 0 },
      { key: 'warranty_card', value: 0 },
      { key: 'receipt', value: 0 },
    ])
    .onConflictDoNothing()
  console.log('Seeded counters')
}
```

- [ ] **Step 6: Apply the migration and re-seed**

Run: `npm run db:migrate && npm run db:seed`
Expected: migration applies cleanly; seed output includes `Seeded counters` (the `onConflictDoNothing` means the three pre-existing counters are untouched and only `receipt` is newly inserted — confirm with the query below)

- [ ] **Step 7: Verify the new column and counter**

```bash
npx tsx --env-file=.env.local -e "
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
const counters = await sql\`SELECT key, value FROM counters ORDER BY key\`
console.log(counters)
const cols = await sql\`SELECT column_name FROM information_schema.columns WHERE table_name = 'jobs' AND column_name IN ('payment_terms', 'confirmed_at')\`
console.log(cols)
"
```

Expected: `counters` includes `{ key: 'receipt', value: 0 }` alongside the three existing rows; `cols` lists both `payment_terms` and `confirmed_at`.

- [ ] **Step 8: Stage and commit (after user review)**

```bash
git add src/db/schema.ts src/db/migrations scripts/seed.ts
git commit -m "feat: add payments table and order/receipt document support"
```

---

### Task 3: Payment terms field and payment form validation

**Files:**
- Modify: `src/lib/jobs/schema.ts`
- Modify: `src/lib/jobs/schema.test.ts`
- Modify: `src/app/admin/(protected)/jobs/[id]/JobEditor.tsx`
- Modify: `src/app/admin/(protected)/jobs/actions.ts` (persist `paymentTerms` in `saveJob`)

**Interfaces:**
- Consumes: `parseMoneyToCents` from `@/lib/money`
- Produces: `PAYMENT_KINDS` constant, `paymentFormSchema`, `PaymentFormInput` type; `jobDetailsFormSchema`'s output now includes `paymentTerms: string | null`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/jobs/schema.test.ts`. First, extend the existing `DETAILS` fixture object with the new field:

```ts
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
  paymentTerms: '',
}
```

Add a new test inside the existing `describe('jobDetailsFormSchema', ...)` block:

```ts
  it('turns a blank payment terms field into null, for the render-time default to apply', () => {
    expect(jobDetailsFormSchema.parse(DETAILS).paymentTerms).toBeNull()
  })

  it('keeps a custom payment terms sentence', () => {
    const parsed = jobDetailsFormSchema.parse({ ...DETAILS, paymentTerms: 'Balance due on delivery.' })
    expect(parsed.paymentTerms).toBe('Balance due on delivery.')
  })
```

Add a new top-level `describe` block, after the `clauseFormSchema` one:

```ts
describe('paymentFormSchema', () => {
  const PAYMENT = { kind: 'advance', amount: '150,000.00', paidAt: '2026-09-19', method: 'Bank transfer', note: '' }

  it('accepts a well-formed advance payment', () => {
    expect(paymentFormSchema.safeParse(PAYMENT).success).toBe(true)
  })

  it('converts the amount to cents', () => {
    expect(paymentFormSchema.parse(PAYMENT).amountCents).toBe(150_000_00)
  })

  it('rejects a missing amount', () => {
    expect(paymentFormSchema.safeParse({ ...PAYMENT, amount: '' }).success).toBe(false)
  })

  it('rejects a non-numeric amount', () => {
    expect(paymentFormSchema.safeParse({ ...PAYMENT, amount: 'lots' }).success).toBe(false)
  })

  it('requires a date paid', () => {
    expect(paymentFormSchema.safeParse({ ...PAYMENT, paidAt: '' }).success).toBe(false)
  })

  it('rejects an unknown kind', () => {
    expect(paymentFormSchema.safeParse({ ...PAYMENT, kind: 'refund' }).success).toBe(false)
  })

  it('turns a blank method into null', () => {
    expect(paymentFormSchema.parse({ ...PAYMENT, method: '' }).method).toBeNull()
  })

  it('turns a blank note into null', () => {
    expect(paymentFormSchema.parse(PAYMENT).note).toBeNull()
  })

  it('accepts the other kind with a note', () => {
    const parsed = paymentFormSchema.parse({ ...PAYMENT, kind: 'other', note: 'Deposit refund adjustment' })
    expect(parsed.kind).toBe('other')
    expect(parsed.note).toBe('Deposit refund adjustment')
  })
})
```

Update the top import line to add `paymentFormSchema`:

```ts
import { clauseFormSchema, customerFormSchema, jobDetailsFormSchema, jobUnitsSchema, paymentFormSchema } from './schema'
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/jobs/schema.test.ts`
Expected: FAIL — `paymentFormSchema is not defined`, and the two new `jobDetailsFormSchema` assertions fail with `paymentTerms` being `undefined`

- [ ] **Step 3: Add `paymentTerms` to `jobDetailsFormSchema`**

In `src/lib/jobs/schema.ts`, add the field to the object passed to `jobDetailsFormSchema`'s `z.object({...})`, alongside `notes`:

```ts
    notes: blankToNull,
    paymentTerms: blankToNull,
  })
```

And add it to the `.transform()`'s returned object:

```ts
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
      paymentTerms: data.paymentTerms,
    }
```

- [ ] **Step 4: Add `PAYMENT_KINDS` and `paymentFormSchema`**

Add to `src/lib/jobs/schema.ts`, after `CLAUSE_KINDS`:

```ts
export const PAYMENT_KINDS = ['advance', 'final', 'other'] as const
```

Add near the bottom of the file, after `jobUnitsSchema`:

```ts
export const paymentFormSchema = z.object({
  kind: z.enum(PAYMENT_KINDS),
  amount: requiredMoney('Enter an amount like 150,000.00'),
  paidAt: z.string().trim().min(1, 'Date paid is required'),
  method: blankToNull,
  note: blankToNull,
})
  .transform((data) => ({
    kind: data.kind,
    amountCents: data.amount,
    paidAt: data.paidAt,
    method: data.method,
    note: data.note,
  }))

export type PaymentFormInput = z.infer<typeof paymentFormSchema>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/jobs/schema.test.ts`
Expected: PASS, 39 tests

- [ ] **Step 6: Add the field to the edit screen**

In `JobEditor.tsx`, add a field after the existing "Internal notes" `<textarea>` (inside the "Quotation details" `<section>`, before `<DeliveryFields .../>`):

```tsx
        <div>
          <label htmlFor="paymentTerms" className={LABEL}>
            Payment terms (shown on the order document)
          </label>
          <textarea
            id="paymentTerms"
            name="paymentTerms"
            rows={2}
            defaultValue={job.paymentTerms ?? ''}
            placeholder={DEFAULT_PAYMENT_TERMS}
            className={FIELD}
          />
        </div>
```

Add the import at the top of `JobEditor.tsx`:

```ts
import { DEFAULT_PAYMENT_TERMS } from '@/lib/jobs/payments'
```

- [ ] **Step 7: Persist the field in `saveJob`**

In `src/app/admin/(protected)/jobs/actions.ts`, add `paymentTerms: detailsParsed.data.paymentTerms` to the object passed to `.set({...})` in the `db.update(jobs)` call, alongside `notes: detailsParsed.data.notes`.

- [ ] **Step 8: Verify in the running app**

Run: `npm run dev`. Open an existing job's edit screen, confirm the "Payment terms" field renders empty with the default sentence as a greyed placeholder, type a custom sentence, save, reload the page.
Expected: the custom sentence persists across reload; leaving it blank and saving again shows the placeholder again (not an error).

- [ ] **Step 9: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 10: Stage and commit (after user review)**

```bash
git add src/lib/jobs/schema.ts src/lib/jobs/schema.test.ts "src/app/admin/(protected)/jobs/[id]/JobEditor.tsx" "src/app/admin/(protected)/jobs/actions.ts"
git commit -m "feat: add payment terms field and payment form validation"
```

---

### Task 4: Manual stage advance — Confirm order / Revert to quotation

**Files:**
- Modify: `src/app/admin/(protected)/jobs/actions.ts` (add `setJobStage`)
- Create: `src/app/admin/(protected)/jobs/[id]/StageButtons.tsx`
- Modify: `src/app/admin/(protected)/jobs/[id]/page.tsx`

**Interfaces:**
- Consumes: `loadJob` from `@/lib/jobs/queries`; `jobTotals` from `@/lib/jobs/totals`; `JOB_STAGES` from `@/lib/jobs/schema` (already exported)
- Produces: Server Action `setJobStage(formData: FormData): Promise<void>`

- [ ] **Step 1: Write the `setJobStage` action**

Add to `src/app/admin/(protected)/jobs/actions.ts`. It needs `loadJob` and `jobTotals` to check the resolved-unit invariant when advancing to `'order'`. Update the file's existing import lines to:

```ts
import { customerFormSchema, JOB_STAGES, JOB_STATUSES, jobDetailsFormSchema, jobUnitsSchema } from '@/lib/jobs/schema'
import { allocateRef, loadJob } from '@/lib/jobs/queries'
import { jobTotals } from '@/lib/jobs/totals'
```

(The first two lines replace the file's existing `@/lib/jobs/schema` and `@/lib/jobs/queries` import lines — adding `JOB_STAGES` and `loadJob` respectively; the third is new.)

```ts
/** Confirms a job as an order, or reverts it back to a quotation. Reverting is
 *  always allowed (a mis-click undo); confirming is refused server-side — not just
 *  hidden client-side — when any unit is still unresolved, since an order with an
 *  open choice has no total and no meaning. Recording a payment never calls this: a
 *  stage change is always an explicit admin action, never implied by money arriving. */
export async function setJobStage(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const stage = String(formData.get('stage') ?? '')
  if (!id || !JOB_STAGES.includes(stage as (typeof JOB_STAGES)[number])) return

  if (stage === 'order') {
    const loaded = await loadJob(id)
    if (!loaded || jobTotals({
      units: loaded.units,
      discountCents: loaded.job.discountCents,
      freeDelivery: loaded.job.freeDelivery,
      deliveryChargeCents: loaded.job.deliveryChargeCents,
    }) === null) {
      return
    }
    await db.update(jobs).set({ stage, confirmedAt: new Date(), updatedAt: new Date() }).where(eq(jobs.id, id))
  } else {
    await db.update(jobs).set({ stage, updatedAt: new Date() }).where(eq(jobs.id, id))
  }

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${id}`)
}
```

Note this silently no-ops on an invalid confirm attempt (mirroring `setJobStatus`'s existing style of silently returning on bad input) — the client-side button in Step 2 is disabled in that situation so the admin normally can't trigger it, but a defensive server check is required per the Global Constraints, not merely a UI affordance.

- [ ] **Step 2: Write the stage buttons component**

Create `src/app/admin/(protected)/jobs/[id]/StageButtons.tsx`:

```tsx
'use client'
import { setJobStage } from '../actions'

/** Shows exactly one of the two stage-changing actions, based on the job's current
 *  stage — never both at once, since they're inverses of each other. `resolved` gates
 *  Confirm order client-side (disabled + reason shown) as a UX nicety; the action
 *  itself re-checks server-side regardless, per this slice's invariant that a job
 *  cannot become an order while any unit is unresolved. */
export function StageButtons({ jobId, stage, resolved }: { jobId: string; stage: string; resolved: boolean }) {
  if (stage === 'order') {
    return (
      <form
        action={setJobStage}
        onSubmit={(e) => {
          if (!confirm('Revert this order back to a quotation?')) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={jobId} />
        <input type="hidden" name="stage" value="quotation" />
        <button
          type="submit"
          className="u-mono text-xs text-navy/60 underline"
        >
          Revert to quotation
        </button>
      </form>
    )
  }

  return (
    <form
      action={setJobStage}
      onSubmit={(e) => {
        if (!confirm('Confirm this quotation as an order?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={jobId} />
      <input type="hidden" name="stage" value="order" />
      <button
        type="submit"
        disabled={!resolved}
        title={resolved ? undefined : 'Every unit needs a chosen option before this quotation can become an order'}
        className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirm order
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Wire it into the job header**

In `src/app/admin/(protected)/jobs/[id]/page.tsx`, compute whether the job resolves and render `StageButtons` alongside the existing `CancelQuotationButton` and Documents link. Add the import and the `jobTotals` check:

```tsx
import { jobTotals } from '@/lib/jobs/totals'
import { StageButtons } from './StageButtons'
```

```tsx
  const resolved = jobTotals({
    units: loaded.units,
    discountCents: loaded.job.discountCents,
    freeDelivery: loaded.job.freeDelivery,
    deliveryChargeCents: loaded.job.deliveryChargeCents,
  }) !== null
```

Add `<StageButtons jobId={id} stage={loaded.job.stage} resolved={resolved} />` into the header's button row, before `CancelQuotationButton`:

```tsx
        <div className="flex flex-wrap items-center gap-3">
          <StageButtons jobId={id} stage={loaded.job.stage} resolved={resolved} />
          {loaded.job.status !== 'cancelled' && <CancelQuotationButton jobId={id} />}
          <Link
            href={`/admin/jobs/${id}/documents`}
            ...
```

- [ ] **Step 4: Verify in the running app**

Run: `npm run dev`. On a job with a still-open option choice, confirm the Confirm order button is disabled with a tooltip explaining why. Resolve the choice and save; confirm the button becomes enabled. Click it, confirm the prompt, confirm the job now shows `stage: 'order'` in `/admin/jobs` and the Confirm order button is replaced by "Revert to quotation". Click Revert, confirm the prompt, confirm the job returns to `stage: 'quotation'` and the Confirm order button reappears (correctly disabled/enabled per its current resolution state).

- [ ] **Step 5: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS (no new automated tests in this task — see Global Constraints on action/UI verification)

- [ ] **Step 6: Stage and commit (after user review)**

```bash
git add "src/app/admin/(protected)/jobs/actions.ts" "src/app/admin/(protected)/jobs/[id]/StageButtons.tsx" "src/app/admin/(protected)/jobs/[id]/page.tsx"
git commit -m "feat: add manual quotation-to-order stage advance"
```

---

### Task 5: Payments admin section

**Files:**
- Modify: `src/lib/jobs/queries.ts` (add `listPayments`, `getJobBalance`)
- Create: `src/app/admin/(protected)/jobs/[id]/payments/actions.ts`
- Create: `src/app/admin/(protected)/jobs/[id]/payments/page.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/payments/loading.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/payments/PaymentForm.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/payments/PaymentRow.tsx`
- Modify: `src/app/admin/(protected)/jobs/[id]/page.tsx` (add Payments link)

**Interfaces:**
- Consumes: `paymentFormSchema` from `@/lib/jobs/schema`; `paymentPosition`, `paidTotalCents` from `@/lib/jobs/payments`; `jobTotals` from `@/lib/jobs/totals`; `loadJob` from `@/lib/jobs/queries`
- Produces: `listPayments(jobId: string)`, `getJobBalance(jobId: string)`; Server Actions `recordPayment`, `deletePayment`

- [ ] **Step 1: Add payment queries**

Add to `src/lib/jobs/queries.ts`:

```ts
import { desc, eq } from 'drizzle-orm'
import { customers, jobClauses, jobUnits, jobs, optionSpecs, payments, unitOptions } from '@/db/schema'
import { jobTotals } from './totals'
import { paymentPosition } from './payments'
```

(Merge these into the existing `drizzle-orm` and `@/db/schema` import lines at the top of the file rather than duplicating them — `desc` may already be imported; `payments` is new.)

```ts
export async function listPayments(jobId: string) {
  return db.select().from(payments).where(eq(payments.jobId, jobId)).orderBy(desc(payments.paidAt), desc(payments.createdAt))
}

/** The one place stage/payments/totals compose for display — used by both the
 *  payments page (to show the running balance) and the order-document generator
 *  (Task 11, which refuses to generate without a resolved job). */
export async function getJobBalance(jobId: string) {
  const loaded = await loadJob(jobId)
  if (!loaded) return null

  const totals = jobTotals({
    units: loaded.units,
    discountCents: loaded.job.discountCents,
    freeDelivery: loaded.job.freeDelivery,
    deliveryChargeCents: loaded.job.deliveryChargeCents,
  })
  const paymentRows = await listPayments(jobId)
  return {
    totals,
    payments: paymentRows,
    position: paymentPosition(totals?.totalCents ?? null, paymentRows),
  }
}
```

- [ ] **Step 2: Write the payment actions**

Create `src/app/admin/(protected)/jobs/[id]/payments/actions.ts`:

```ts
'use server'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { payments } from '@/db/schema'
import { paymentFormSchema } from '@/lib/jobs/schema'

export interface ActionState {
  error?: string
  success?: boolean
}

/** Recording a payment never changes jobs.stage — see this slice's central
 *  invariant. The admin confirms the order separately, from the job header. */
export async function recordPayment(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  if (!jobId) return { error: 'Missing job id.' }

  const parsed = paymentFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  await db.insert(payments).values({
    id: randomUUID(),
    jobId,
    kind: parsed.data.kind,
    amountCents: parsed.data.amountCents,
    paidAt: parsed.data.paidAt,
    method: parsed.data.method,
    note: parsed.data.note,
  })

  revalidatePath(`/admin/jobs/${jobId}/payments`)
  return { success: true }
}

/** Plain (formData)-only signature, matching deleteJob/setJobStatus's convention for
 *  actions with no per-field feedback. A receipt already issued for this payment is
 *  unaffected — job_documents.payment_id is ON DELETE SET NULL, not CASCADE. */
export async function deletePayment(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const jobId = String(formData.get('jobId') ?? '')
  if (!id || !jobId) return

  await db.delete(payments).where(eq(payments.id, id))

  revalidatePath(`/admin/jobs/${jobId}/payments`)
}
```

- [ ] **Step 3: Write `PaymentForm`**

Create `src/app/admin/(protected)/jobs/[id]/payments/PaymentForm.tsx`:

```tsx
'use client'
import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { recordPayment, type ActionState } from './actions'

const initialState: ActionState = {}
const FIELD = 'mt-1 w-full border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Free-text `method` with suggestions rather than a fixed dropdown — payments.method
 *  has no enum in the schema (see schema.ts's comment on the jobs.salesPerson
 *  precedent this follows), so a <datalist> offers common values without forcing them. */
export function PaymentForm({ jobId, stage }: { jobId: string; stage: string }) {
  const [state, formAction] = useActionState(recordPayment, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      toast.success(
        stage === 'quotation'
          ? 'Payment recorded. This quotation now has a payment — confirm it as an order from the job page when ready.'
          : 'Payment recorded.',
      )
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, stage])

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 border-2 border-navy p-4 sm:grid-cols-2">
      <input type="hidden" name="jobId" value={jobId} />
      <div>
        <label htmlFor="kind" className={LABEL}>
          Kind
        </label>
        <select id="kind" name="kind" defaultValue="advance" className={FIELD}>
          <option value="advance">Advance</option>
          <option value="final">Final</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="amount" className={LABEL}>
          Amount
        </label>
        <input id="amount" name="amount" inputMode="decimal" placeholder="150,000.00" required className={FIELD} />
      </div>
      <div>
        <label htmlFor="paidAt" className={LABEL}>
          Date paid
        </label>
        <input id="paidAt" name="paidAt" type="date" defaultValue={today()} required className={FIELD} />
      </div>
      <div>
        <label htmlFor="method" className={LABEL}>
          Method (optional)
        </label>
        <input id="method" name="method" list="payment-methods" className={FIELD} />
        <datalist id="payment-methods">
          <option value="Cash" />
          <option value="Bank transfer" />
          <option value="Cheque" />
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="note" className={LABEL}>
          Note (optional)
        </label>
        <input id="note" name="note" className={FIELD} />
      </div>
      <div className="sm:col-span-2">
        <AdminSubmitButton
          label="Record payment"
          pendingLabel="Recording"
          className="rounded-full bg-yellow px-6 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
        />
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Write `PaymentRow`**

Create `src/app/admin/(protected)/jobs/[id]/payments/PaymentRow.tsx`. Its "Generate receipt" button is stubbed as a disabled placeholder here — Task 11 replaces it with a working `GenerateReceiptButton` once `generateReceipt` exists:

```tsx
'use client'
import { formatCents } from '@/lib/money'
import { deletePayment } from './actions'

const KIND_LABELS: Record<string, string> = { advance: 'Advance', final: 'Final', other: 'Other' }

export function PaymentRow({
  id,
  jobId,
  kind,
  amountCents,
  paidAt,
  method,
  note,
}: {
  id: string
  jobId: string
  kind: string
  amountCents: number
  paidAt: string
  method: string | null
  note: string | null
}) {
  return (
    <div data-testid="payment-row" className="flex flex-wrap items-center justify-between gap-4 border border-navy/40 p-4">
      <div>
        <p className="font-display text-navy">
          {formatCents(amountCents)} <span className="u-mono text-xs text-navy/60">({KIND_LABELS[kind] ?? kind})</span>
        </p>
        <p className="u-mono mt-1 text-xs text-navy/60">
          {paidAt}
          {method ? ` · ${method}` : ''}
          {note ? ` · ${note}` : ''}
        </p>
      </div>
      <form
        action={deletePayment}
        onSubmit={(e) => {
          if (!confirm('Delete this payment?')) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="jobId" value={jobId} />
        <button type="submit" className="u-mono text-xs text-navy/60 underline">
          Delete
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Write the payments page**

Create `src/app/admin/(protected)/jobs/[id]/payments/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatCents } from '@/lib/money'
import { getJobBalance } from '@/lib/jobs/queries'
import { loadJob } from '@/lib/jobs/queries'
import { PaymentForm } from './PaymentForm'
import { PaymentRow } from './PaymentRow'

export default async function JobPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const loaded = await loadJob(id)
  if (!loaded) notFound()

  const balance = await getJobBalance(id)

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/jobs/${id}`} className="u-mono text-xs text-navy/60 underline">
          ← Back to {loaded.job.ref}
        </Link>
        <h1 className="mt-2 font-display text-2xl text-navy">Payments</h1>
        <p className="u-mono mt-1 text-navy/70">
          {loaded.job.ref} — {loaded.customer.name}
        </p>
      </div>

      <div className="border-2 border-navy p-4">
        {balance?.position ? (
          <dl data-testid="balance-summary" className="u-mono grid grid-cols-2 gap-2 text-sm text-navy sm:grid-cols-4">
            <div>
              <dt className="text-navy/60">Total</dt>
              <dd data-testid="balance-total">{formatCents(balance.totals!.totalCents)}</dd>
            </div>
            <div>
              <dt className="text-navy/60">Paid</dt>
              <dd data-testid="balance-paid">{formatCents(balance.position.paidCents)}</dd>
            </div>
            <div>
              <dt className="text-navy/60">Balance</dt>
              <dd data-testid="balance-remaining">{formatCents(balance.position.balanceCents)}</dd>
            </div>
          </dl>
        ) : (
          <p data-testid="balance-unresolved" className="u-mono text-sm text-navy/70">
            This job has no total yet — resolve every unit's option before a balance can be shown.
          </p>
        )}
      </div>

      <PaymentForm jobId={id} stage={loaded.job.stage} />

      <div className="space-y-4">
        {(!balance || balance.payments.length === 0) && (
          <p className="u-mono text-sm text-navy/70">No payments recorded yet.</p>
        )}
        {balance?.payments.map((p) => (
          <PaymentRow
            key={p.id}
            id={p.id}
            jobId={id}
            kind={p.kind}
            amountCents={p.amountCents}
            paidAt={p.paidAt}
            method={p.method}
            note={p.note}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add `loading.tsx` and the Payments link**

Create `src/app/admin/(protected)/jobs/[id]/payments/loading.tsx`:

```tsx
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen'

export default function Loading() {
  return <AdminLoadingScreen />
}
```

In `src/app/admin/(protected)/jobs/[id]/page.tsx`, add a Payments link into the header's button row, after `StageButtons`/`CancelQuotationButton` and before the Documents link:

```tsx
          <Link
            href={`/admin/jobs/${id}/payments`}
            className="rounded-full border border-navy px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95"
          >
            Payments
          </Link>
```

- [ ] **Step 7: Verify in the running app**

Run: `npm run dev`. Open a resolved job's Payments page: confirm the balance summary shows Total/Paid/Balance with Paid at 0 and Balance equal to Total. Record an advance payment; confirm the balance updates, a toast prompts confirming as an order (since the job is still at `stage: 'quotation'`), and the row appears in the list. Delete the payment; confirm the balance reverts and the row disappears. On an unresolved job's Payments page, confirm the balance summary shows the "no total yet" message instead of numbers, and that recording a payment still works (payments track independently of whether the job is priced yet).

- [ ] **Step 8: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: PASS

- [ ] **Step 9: Stage and commit (after user review)**

```bash
git add src/lib/jobs/queries.ts "src/app/admin/(protected)/jobs/[id]/payments" "src/app/admin/(protected)/jobs/[id]/page.tsx"
git commit -m "feat: add the payments admin section"
```

---

### Task 6: Extract shared PDF blocks

Pure refactor: moves Slice 1's seven module-local rendering functions out of `QuotationDocument.tsx` into a shared file, changing nothing about what they render. `OrderDocument` and `ReceiptDocument` (Tasks 8 and 10) both need the header, client/meta block, table, delivery row, totals block, clause list and signature block this extracts.

**Files:**
- Create: `src/pdf/blocks.tsx`
- Modify: `src/pdf/QuotationDocument.tsx`

**Interfaces:**
- Consumes: `QuotationSnapshot`, `SnapshotClause`, `SnapshotUnit` from `@/lib/jobs/snapshot`; `styles` from `./styles`; `SpecMarker`, `OptionMarker` from `./Marker`
- Produces: `companyHeader(title: string)`, `clientAndMetaBlock(fields: { label: string; value: string }[], customer: SnapshotCustomer)`, `tableHeader()`, `unitRows(unit: SnapshotUnit, unitIndex: number)`, `deliveryRow(delivery: QuotationSnapshot['delivery'])`, `totalsBlock(totals: QuotationSnapshot['totals'], extraRows?: { label: string; value: string }[])`, `clauseList(heading: string, clauses: SnapshotClause[])`, `signatureBlock()`

Two of these functions change shape slightly to be reusable beyond the quotation:

- `companyHeader` takes a `title` parameter (`'QUOTATION'`, `'ORDER'`, or `'RECEIPT'`) instead of hardcoding `'QUOTATION'`.
- `clientAndMeta` becomes `clientAndMetaBlock`, taking the meta lines as a `{ label, value }[]` array instead of being hardcoded to date/quotation-number/sales-person, so `OrderDocument` can show `DATE` / `ORDER` / `SALES PERSON` with a different date and `ReceiptDocument` can show a different set entirely.
- `totalsBlock` gains an optional `extraRows` parameter appended after the discount row and before the final TOTAL row — this is how `OrderDocument` adds Advance Paid / Balance Due without duplicating the whole block.

- [ ] **Step 1: Create `src/pdf/blocks.tsx`**

```tsx
import { Text, View } from '@react-pdf/renderer'
import type { QuotationSnapshot, SnapshotClause, SnapshotCustomer, SnapshotUnit } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { SpecMarker, OptionMarker } from './Marker'

// Shared across every document kind (quotation, order, receipt, and — slice 4 —
// invoices and the warranty card). Sub-sections are plain functions called as
// `{section()}`, never JSX tags like `<Section />` — see QuotationDocument.test.tsx's
// (and now OrderDocument.test.tsx's / ReceiptDocument.test.tsx's) doc comment on why:
// the tree-walking tests read `element.props.children` directly with no render pass,
// so a `<Section />` tag would just be an unevaluated reference, never resolved.

export function companyHeader(title: string) {
  return (
    <View style={styles.companyBlock}>
      <Text style={styles.companyName}>ROOMY CREATIONS</Text>
      <Text style={styles.companyLine}>Furniture & Interior Solutions</Text>
      <Text style={styles.companyLine}>+94 72 292 0088 · roomycreation@gmail.com</Text>
      <View style={styles.ruleThick} />
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

export function clientAndMetaBlock(fields: { label: string; value: string }[], customer: SnapshotCustomer) {
  const cityLine = [customer.city, customer.district].filter((v) => v !== null && v !== '').join(', ')
  return (
    <View style={styles.topRow}>
      <View style={styles.clientBlock}>
        <Text style={styles.clientLabel}>TO</Text>
        <Text style={styles.clientLine}>{customer.name}</Text>
        {customer.addressLines.map((line, i) => (
          <Text key={i} style={styles.clientLine}>
            {line}
          </Text>
        ))}
        {cityLine !== '' && <Text style={styles.clientLine}>{cityLine}</Text>}
        <Text style={styles.clientLine}>{customer.phone}</Text>
        {customer.email && <Text style={styles.clientLine}>{customer.email}</Text>}
      </View>
      <View style={styles.metaBlock}>
        {fields.map((f, i) => (
          <Text key={i} style={styles.metaLine}>
            <Text style={styles.metaLabel}>{f.label}: </Text>
            {f.value}
          </Text>
        ))}
      </View>
    </View>
  )
}

export function tableHeader() {
  return (
    <View style={styles.tableHeaderRow}>
      <View style={styles.cellDescription}>
        <Text style={styles.headerCellText}>DESCRIPTION</Text>
      </View>
      <View style={styles.cellPrice}>
        <Text style={styles.headerCellText}>PRICE</Text>
      </View>
      <View style={styles.cellQty}>
        <Text style={styles.headerCellText}>QTY/UNITS</Text>
      </View>
      <View style={styles.cellTotal}>
        <Text style={styles.headerCellText}>TOTAL</Text>
      </View>
    </View>
  )
}

// One table row per option. A resolved unit has already been reduced to a single
// option by buildQuotationSnapshot, so this only ever prints more than one row per
// unit when the customer still has a choice to make.
export function unitRows(unit: SnapshotUnit, unitIndex: number) {
  const showOptionLabel = unit.options.length > 1
  return unit.options.map((option, optionIndex) => (
    <View
      key={`${unitIndex}-${optionIndex}`}
      style={optionIndex === unit.options.length - 1 ? styles.tableRowLast : styles.tableRow}
    >
      <View style={styles.cellDescription}>
        {optionIndex === 0 && <Text style={styles.unitTitle}>{unit.title}</Text>}
        {showOptionLabel && option.label && (
          <View style={styles.optionRow}>
            <OptionMarker />
            <Text style={styles.optionLabel}>{option.label}</Text>
          </View>
        )}
        {option.specs.map((spec, specIndex) => (
          <View key={specIndex} style={styles.specRow}>
            <SpecMarker />
            <Text style={styles.specText}>
              {spec.label && <Text style={styles.specLabel}>{spec.label} - </Text>}
              {spec.value}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.cellPrice}>
        <Text>{option.priceLabel}</Text>
      </View>
      <View style={styles.cellQty}>
        <Text>{option.qtyLabel}</Text>
      </View>
      <View style={styles.cellTotal}>
        <Text>{option.totalLabel}</Text>
      </View>
    </View>
  ))
}

export function deliveryRow(delivery: QuotationSnapshot['delivery']) {
  if (delivery.kind === 'none') return null
  return (
    <View style={styles.deliveryRow}>
      <Text>Delivery Charges & Installation Charges For All Items</Text>
      <Text>{delivery.kind === 'free' ? 'Free' : delivery.amountLabel}</Text>
    </View>
  )
}

/** `extraRows` prints after the final TOTAL row — used by OrderDocument to add
 *  Advance Paid / Balance Due without a second totals block. */
export function totalsBlock(totals: QuotationSnapshot['totals'], extraRows: { label: string; value: string }[] = []) {
  if (!totals) return null
  return (
    <View style={styles.totalsBlock}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal</Text>
        <Text style={styles.totalsValue}>{totals.subtotalLabel}</Text>
      </View>
      {totals.discountAmountLabel !== null && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{totals.discountLabel}</Text>
          <Text style={styles.totalsValue}>{totals.discountAmountLabel}</Text>
        </View>
      )}
      <View style={styles.totalsRowFinal}>
        <Text style={styles.totalsLabelFinal}>TOTAL</Text>
        <Text style={styles.totalsValueFinal}>{totals.totalLabel}</Text>
      </View>
      {extraRows.map((row, i) => (
        <View key={i} style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{row.label}</Text>
          <Text style={styles.totalsValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

export function clauseList(heading: string, clauses: SnapshotClause[]) {
  if (clauses.length === 0) return null
  return (
    <View>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {clauses.map((clause, i) => (
        <View key={i} style={styles.clauseRow}>
          <Text style={styles.clauseIndex}>{i + 1}.</Text>
          <Text style={clause.emphasis ? styles.clauseBodyEmphasis : styles.clauseBody}>{clause.body}</Text>
        </View>
      ))}
    </View>
  )
}

export function signatureBlock() {
  return (
    <View style={styles.signatureRow}>
      <View style={styles.signatureColumn}>
        <Text style={styles.signatureLine}>Thanking you,</Text>
        <Text style={styles.signatureLine}>Roomy Creations</Text>
        <Text style={styles.signatureSpace}>Authorized Signature</Text>
      </View>
      <View style={styles.signatureColumn}>
        <Text style={styles.signatureLine}>Approved by Client</Text>
        {/* Matches the left column's two-line lead-in so both signature lines sit at
            the same height — signatureSpace's margin is measured from the preceding
            text, not the row top. */}
        <Text style={styles.signatureLine}> </Text>
        <Text style={styles.signatureSpace}>{"Client's Signature"}</Text>
      </View>
    </View>
  )
}
```

Note the `extraRows` totals row reuses `styles.totalsRow`/`styles.totalsLabel`/`styles.totalsValue` — the same plain (non-final) row style already used for the discount row — so no new styles are needed for this piece.

- [ ] **Step 2: Rewrite `QuotationDocument.tsx` to consume the shared blocks**

Replace the entire contents of `src/pdf/QuotationDocument.tsx`:

```tsx
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { QuotationSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, signatureBlock, tableHeader, totalsBlock, unitRows } from './blocks'

function metaFields(snapshot: QuotationSnapshot) {
  return [
    { label: 'DATE', value: snapshot.quotationDate },
    { label: 'QUOTATION', value: snapshot.ref },
    { label: 'SALES PERSON', value: snapshot.salesPerson ?? '-' },
  ]
}

export function QuotationDocument({ snapshot }: { snapshot: QuotationSnapshot }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('QUOTATION')}
        {clientAndMetaBlock(metaFields(snapshot), snapshot.customer)}
        <View style={styles.table}>
          {tableHeader()}
          {snapshot.units.map((unit, i) => unitRows(unit, i))}
        </View>
        {deliveryRow(snapshot.delivery)}
        {totalsBlock(snapshot.totals)}
        <Text style={styles.tagline}>
          Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard
        </Text>
        {clauseList('Terms & Conditions', snapshot.terms)}
        {clauseList('Warranty', snapshot.warranty)}
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderQuotationPdf(snapshot: QuotationSnapshot): Promise<Buffer> {
  return renderToBuffer(<QuotationDocument snapshot={snapshot} />)
}
```

- [ ] **Step 3: Run the existing quotation test suite unmodified**

Run: `npx vitest run src/pdf/QuotationDocument.test.tsx`
Expected: PASS, all 11 tests — **with no edit to `QuotationDocument.test.tsx` itself.** If any test fails, the refactor changed rendered output; fix `blocks.tsx`/`QuotationDocument.tsx` until it passes again. Do not adjust the test to make it pass — this test file is the regression guard for the whole refactor, per the Slice 2 spec's PDF composition section.

- [ ] **Step 4: Run the full suite, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: PASS — the build check matters here because `@react-pdf/renderer`'s server-runtime bundling is sensitive to how its components are imported/re-exported.

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/pdf/blocks.tsx src/pdf/QuotationDocument.tsx
git commit -m "refactor: extract shared PDF blocks from QuotationDocument"
```

---

### Task 7: Order document snapshot

**Files:**
- Modify: `src/lib/jobs/snapshot.ts`
- Modify: `src/lib/jobs/snapshot.test.ts`

**Interfaces:**
- Consumes: `buildQuotationSnapshot`, `SnapshotInput` (existing, unchanged); `paymentPosition`, `DEFAULT_PAYMENT_TERMS` from `./payments`
- Produces: type `OrderSnapshot`; `buildOrderSnapshot(input: OrderSnapshotInput): OrderSnapshot`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/jobs/snapshot.test.ts`:

```ts
import { buildOrderSnapshot } from './snapshot'
import type { OrderSnapshotInput } from './snapshot'
```

(Merge into the existing `import { buildQuotationSnapshot } from './snapshot'` and `import type { SnapshotInput } from './snapshot'` lines at the top of the file.)

```ts
const RESOLVED_UNIT = {
  id: 'u1',
  title: 'Wardrobe with Dressing Unite',
  options: [{ id: 'o1', label: null, priceCents: 368_500_00, qty: 1, selected: false, specs: [] }],
}

const ORDER_BASE: OrderSnapshotInput = {
  ...BASE,
  units: [RESOLVED_UNIT],
  discountCents: 0,
  confirmedDate: '2026-09-19',
  paymentTerms: null,
  payments: [{ amountCents: 150_000_00 }],
}

describe('buildOrderSnapshot', () => {
  it('carries the quotation fields through unchanged', () => {
    const snap = buildOrderSnapshot(ORDER_BASE)
    expect(snap.ref).toBe('RC00188')
    expect(snap.customer.name).toBe('williams')
  })

  it('uses the confirmed date, not the quotation date', () => {
    expect(buildOrderSnapshot(ORDER_BASE).confirmedDate).toBe('2026-09-19')
  })

  it('computes the payment position against the resolved total', () => {
    const snap = buildOrderSnapshot(ORDER_BASE)
    expect(snap.paymentPosition).toEqual({ paidLabel: '150,000.00', balanceLabel: '218,500.00' })
  })

  it('falls back to the default payment terms sentence when none is set', () => {
    expect(buildOrderSnapshot(ORDER_BASE).paymentTerms).toBe('Balance payable on completion of installation.')
  })

  it('uses a custom payment terms sentence when one is set', () => {
    const snap = buildOrderSnapshot({ ...ORDER_BASE, paymentTerms: 'Balance due on delivery.' })
    expect(snap.paymentTerms).toBe('Balance due on delivery.')
  })

  it('has no payment position when the job is not actually resolved', () => {
    const unresolvedUnit = {
      id: 'u2',
      title: 'Study Cupboards',
      options: [
        { id: 'a', label: 'Option 01', priceCents: 182_500_00, qty: 1, selected: false, specs: [] },
        { id: 'b', label: 'Option 02', priceCents: 257_000_00, qty: 1, selected: false, specs: [] },
      ],
    }
    const snap = buildOrderSnapshot({ ...ORDER_BASE, units: [unresolvedUnit] })
    expect(snap.totals).toBeNull()
    expect(snap.paymentPosition).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: FAIL — `buildOrderSnapshot is not defined`

- [ ] **Step 3: Write the implementation**

Add to `src/lib/jobs/snapshot.ts`. Update the top import to add the new dependency:

```ts
import { formatCents } from '@/lib/money'
import { deliveryRow, jobTotals, resolvedOption } from './totals'
import type { JobUnit } from './totals'
import { DEFAULT_PAYMENT_TERMS, paymentPosition } from './payments'
import type { Payment } from './payments'
```

Add these interfaces and the function after `buildQuotationSnapshot`:

```ts
export interface SnapshotPaymentPosition {
  paidLabel: string
  balanceLabel: string
}

export interface OrderSnapshot extends QuotationSnapshot {
  confirmedDate: string
  paymentPosition: SnapshotPaymentPosition | null
  paymentTerms: string
}

export interface OrderSnapshotInput extends SnapshotInput {
  confirmedDate: string
  paymentTerms: string | null
  payments: Payment[]
}

/** Wraps buildQuotationSnapshot rather than duplicating it — the order document's body
 *  is the quotation's body with a different title (handled in OrderDocument.tsx, not
 *  here) plus a payment position and a terms sentence. Deliberately does NOT allocate
 *  a new reference number: the order keeps the job's own ref, per the spec's rule that
 *  the customer knows the job by one number for its whole life. */
export function buildOrderSnapshot(input: OrderSnapshotInput): OrderSnapshot {
  const quotation = buildQuotationSnapshot(input)
  const totals = jobTotals({
    units: input.units,
    discountCents: input.discountCents,
    freeDelivery: input.freeDelivery,
    deliveryChargeCents: input.deliveryChargeCents,
  })
  const position = paymentPosition(totals?.totalCents ?? null, input.payments)

  return {
    ...quotation,
    confirmedDate: input.confirmedDate,
    paymentPosition: position
      ? { paidLabel: formatCents(position.paidCents), balanceLabel: formatCents(position.balanceCents) }
      : null,
    paymentTerms: input.paymentTerms ?? DEFAULT_PAYMENT_TERMS,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: PASS, all quotation-snapshot tests plus 6 new order-snapshot tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/snapshot.ts src/lib/jobs/snapshot.test.ts
git commit -m "feat: add the order document snapshot builder"
```

---

### Task 8: Order document component

**Files:**
- Create: `src/pdf/OrderDocument.tsx`
- Create: `src/pdf/OrderDocument.test.tsx`

**Interfaces:**
- Consumes: `OrderSnapshot` from `@/lib/jobs/snapshot`; every export from `./blocks`
- Produces: `OrderDocument({ snapshot }: { snapshot: OrderSnapshot })`, `renderOrderPdf(snapshot: OrderSnapshot): Promise<Buffer>`

- [ ] **Step 1: Write the failing test**

Create `src/pdf/OrderDocument.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { OrderDocument } from './OrderDocument'
import type { OrderSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: OrderSnapshot = {
  ref: 'RC00188',
  quotationDate: '21-March-2026',
  confirmedDate: '19-September-2026',
  salesPerson: 'ISHAN',
  customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: ['Galapitamulla', 'Kurunegala.'], city: null, district: null },
  units: [
    {
      title: 'Unite 01- Cupboards With Doors',
      options: [{ label: null, priceLabel: '235,000.00', qtyLabel: '01', totalLabel: '235,000.00', specs: [] }],
    },
  ],
  delivery: { kind: 'none', amountLabel: null },
  totals: { subtotalLabel: '235,000.00', discountLabel: 'Cash Discount', discountAmountLabel: null, totalLabel: '235,000.00' },
  paymentPosition: { paidLabel: '100,000.00', balanceLabel: '135,000.00' },
  paymentTerms: 'Balance payable on completion of installation.',
  terms: [],
  warranty: [],
}

function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('OrderDocument', () => {
  it('titles itself ORDER, not QUOTATION', () => {
    expect(textOf(OrderDocument({ snapshot: SNAPSHOT }))).toContain('ORDER')
  })

  it('prints the confirmed date under the ORDER label, not the quotation date', () => {
    const text = textOf(OrderDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('19-September-2026')
  })

  it('keeps the job reference, not a new number', () => {
    expect(textOf(OrderDocument({ snapshot: SNAPSHOT }))).toContain('RC00188')
  })

  it('prints Advance Paid and Balance Due under the totals', () => {
    const text = textOf(OrderDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Advance Paid')
    expect(text).toContain('100,000.00')
    expect(text).toContain('Balance Due')
    expect(text).toContain('135,000.00')
  })

  it('prints the payment terms sentence', () => {
    expect(textOf(OrderDocument({ snapshot: SNAPSHOT }))).toContain('Balance payable on completion of installation.')
  })

  it('omits the payment rows when there is no payment position', () => {
    const text = textOf(OrderDocument({ snapshot: { ...SNAPSHOT, paymentPosition: null } }))
    expect(text).not.toContain('Advance Paid')
    expect(text).not.toContain('Balance Due')
  })

  it('still prints the unit table and standing footer copy', () => {
    const text = textOf(OrderDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Unite 01- Cupboards With Doors')
    expect(text).toContain('235,000.00')
    expect(text).toContain('Thank You For Your Business!')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pdf/OrderDocument.test.tsx`
Expected: FAIL — `Failed to resolve import "./OrderDocument"`

- [ ] **Step 3: Write the implementation**

Create `src/pdf/OrderDocument.tsx`:

```tsx
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { OrderSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, signatureBlock, tableHeader, totalsBlock, unitRows } from './blocks'

function metaFields(snapshot: OrderSnapshot) {
  return [
    { label: 'DATE', value: snapshot.confirmedDate },
    { label: 'ORDER', value: snapshot.ref },
    { label: 'SALES PERSON', value: snapshot.salesPerson ?? '-' },
  ]
}

export function OrderDocument({ snapshot }: { snapshot: OrderSnapshot }) {
  const extraRows = snapshot.paymentPosition
    ? [
        { label: 'Advance Paid', value: snapshot.paymentPosition.paidLabel },
        { label: 'Balance Due', value: snapshot.paymentPosition.balanceLabel },
      ]
    : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('ORDER')}
        {clientAndMetaBlock(metaFields(snapshot), snapshot.customer)}
        <View style={styles.table}>
          {tableHeader()}
          {snapshot.units.map((unit, i) => unitRows(unit, i))}
        </View>
        {deliveryRow(snapshot.delivery)}
        {totalsBlock(snapshot.totals, extraRows)}
        {snapshot.paymentPosition && <Text style={styles.paymentTerms}>{snapshot.paymentTerms}</Text>}
        <Text style={styles.tagline}>
          Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard
        </Text>
        {clauseList('Terms & Conditions', snapshot.terms)}
        {clauseList('Warranty', snapshot.warranty)}
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderOrderPdf(snapshot: OrderSnapshot): Promise<Buffer> {
  return renderToBuffer(<OrderDocument snapshot={snapshot} />)
}
```

Add the `paymentTerms` style to `src/pdf/styles.ts`, in the "Delivery + totals" section, after `totalsValueFinal`:

```ts
  paymentTerms: {
    alignSelf: 'flex-end',
    width: 220,
    marginTop: 4,
    marginBottom: 12,
    fontSize: 8.5,
    fontStyle: 'italic',
    textAlign: 'right',
  },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pdf/OrderDocument.test.tsx`
Expected: PASS, 7 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/pdf/OrderDocument.tsx src/pdf/OrderDocument.test.tsx src/pdf/styles.ts
git commit -m "feat: add the order document PDF"
```

---

### Task 9: Receipt document snapshot

**Files:**
- Modify: `src/lib/jobs/snapshot.ts`
- Modify: `src/lib/jobs/snapshot.test.ts`

**Interfaces:**
- Consumes: `formatReceiptNumber` from `./reference`; `paymentPosition` from `./payments`
- Produces: type `ReceiptSnapshot`; `buildReceiptSnapshot(input: ReceiptSnapshotInput): ReceiptSnapshot`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/jobs/snapshot.test.ts`:

```ts
import { buildReceiptSnapshot } from './snapshot'
import type { ReceiptSnapshotInput } from './snapshot'
```

(Merge into the existing import lines, same as Task 7's Step 1.)

```ts
const RECEIPT_BASE: ReceiptSnapshotInput = {
  number: 'RCP00001',
  ref: 'RC00188',
  customerName: 'williams',
  amountCents: 150_000_00,
  kind: 'advance',
  paidAt: '2026-09-19',
  method: 'Bank transfer',
  totalCents: 368_500_00,
  paymentsIncludingThis: [{ amountCents: 150_000_00 }],
}

describe('buildReceiptSnapshot', () => {
  it('carries the number, job reference and customer name through', () => {
    const snap = buildReceiptSnapshot(RECEIPT_BASE)
    expect(snap.number).toBe('RCP00001')
    expect(snap.ref).toBe('RC00188')
    expect(snap.customerName).toBe('williams')
  })

  it('formats the amount', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).amountLabel).toBe('150,000.00')
  })

  it('labels an advance payment', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).kindLabel).toBe('advance payment')
  })

  it('labels a final payment', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, kind: 'final' }).kindLabel).toBe('final payment')
  })

  it('uses the note verbatim for an other-kind payment', () => {
    const snap = buildReceiptSnapshot({ ...RECEIPT_BASE, kind: 'other', note: 'Deposit refund adjustment' })
    expect(snap.kindLabel).toBe('Deposit refund adjustment')
  })

  it('falls back to a generic label for an other-kind payment with no note', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, kind: 'other', note: null }).kindLabel).toBe('payment')
  })

  it('computes the balance remaining as of this receipt, including the payment it is for', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).balanceRemainingLabel).toBe('218,500.00')
  })

  it('has no balance remaining when the job has no total yet', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, totalCents: null }).balanceRemainingLabel).toBeNull()
  })

  it('carries the payment method through', () => {
    expect(buildReceiptSnapshot(RECEIPT_BASE).method).toBe('Bank transfer')
  })

  it('is null when no method was recorded', () => {
    expect(buildReceiptSnapshot({ ...RECEIPT_BASE, method: null }).method).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: FAIL — `buildReceiptSnapshot is not defined`

- [ ] **Step 3: Write the implementation**

Add to `src/lib/jobs/snapshot.ts`:

```ts
export interface ReceiptSnapshot {
  number: string
  ref: string
  customerName: string
  amountLabel: string
  kindLabel: string
  paidAtLabel: string
  method: string | null
  balanceRemainingLabel: string | null
}

export interface ReceiptSnapshotInput {
  number: string
  ref: string
  customerName: string
  amountCents: number
  kind: 'advance' | 'final' | 'other'
  note?: string | null
  paidAt: string
  method: string | null
  /** The job's total as of receipt time, or null while unresolved — see paymentPosition. */
  totalCents: number | null
  /** Every payment on the job as of receipt time, including the one this receipt is
   *  for, so "balance remaining" reflects the state right after this payment landed. */
  paymentsIncludingThis: Payment[]
}

function receiptKindLabel(kind: ReceiptSnapshotInput['kind'], note: string | null | undefined): string {
  if (kind === 'advance') return 'advance payment'
  if (kind === 'final') return 'final payment'
  return note && note.trim() !== '' ? note : 'payment'
}

/** Deliberately minimal — a single acknowledgement line, not an itemised invoice.
 *  See the Slice 2 spec's "receipt document" section: this is not the advance/final
 *  invoice reserved for Slice 4. */
export function buildReceiptSnapshot(input: ReceiptSnapshotInput): ReceiptSnapshot {
  const position = paymentPosition(input.totalCents, input.paymentsIncludingThis)
  return {
    number: input.number,
    ref: input.ref,
    customerName: input.customerName,
    amountLabel: formatCents(input.amountCents),
    kindLabel: receiptKindLabel(input.kind, input.note),
    paidAtLabel: input.paidAt,
    method: input.method,
    balanceRemainingLabel: position ? formatCents(position.balanceCents) : null,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: PASS, all prior tests plus 10 new receipt-snapshot tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/lib/jobs/snapshot.ts src/lib/jobs/snapshot.test.ts
git commit -m "feat: add the receipt document snapshot builder"
```

---

### Task 10: Receipt document component

**Files:**
- Create: `src/pdf/ReceiptDocument.tsx`
- Create: `src/pdf/ReceiptDocument.test.tsx`

**Interfaces:**
- Consumes: `ReceiptSnapshot` from `@/lib/jobs/snapshot`; `companyHeader`, `signatureBlock` from `./blocks`
- Produces: `ReceiptDocument({ snapshot }: { snapshot: ReceiptSnapshot })`, `renderReceiptPdf(snapshot: ReceiptSnapshot): Promise<Buffer>`

- [ ] **Step 1: Write the failing test**

Create `src/pdf/ReceiptDocument.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { ReceiptDocument } from './ReceiptDocument'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: ReceiptSnapshot = {
  number: 'RCP00001',
  ref: 'RC00188',
  customerName: 'Mr. W. Williams',
  amountLabel: '150,000.00',
  kindLabel: 'advance payment',
  paidAtLabel: '19 Sep 2026',
  method: 'Bank transfer',
  balanceRemainingLabel: '218,500.00',
}

function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('ReceiptDocument', () => {
  it('titles itself RECEIPT and prints its own number', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('RECEIPT')
    expect(text).toContain('RCP00001')
  })

  it('prints the customer name, amount, job reference and reason', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Mr. W. Williams')
    expect(text).toContain('150,000.00')
    expect(text).toContain('RC00188')
    expect(text).toContain('advance payment')
  })

  it('prints the payment method when present', () => {
    expect(textOf(ReceiptDocument({ snapshot: SNAPSHOT }))).toContain('Bank transfer')
  })

  it('omits the method line when none was recorded', () => {
    // Checks for the two-space-before-"by" pattern the method suffix uses
    // (`${paidAtLabel}  by ${method}`), not a bare 'by ' — the signature block's
    // "Approved by Client" always renders and would false-positive on that substring.
    expect(textOf(ReceiptDocument({ snapshot: { ...SNAPSHOT, method: null } }))).not.toContain('  by ')
  })

  it('prints the balance remaining when known', () => {
    expect(textOf(ReceiptDocument({ snapshot: SNAPSHOT }))).toContain('218,500.00')
  })

  it('omits the balance remaining line when the job has no total yet', () => {
    const text = textOf(ReceiptDocument({ snapshot: { ...SNAPSHOT, balanceRemainingLabel: null } }))
    expect(text).not.toContain('Balance remaining')
  })

  it('carries the signature block and standing footer copy', () => {
    const text = textOf(ReceiptDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain("Client's Signature")
    expect(text).toContain('Thank You For Your Business!')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pdf/ReceiptDocument.test.tsx`
Expected: FAIL — `Failed to resolve import "./ReceiptDocument"`

- [ ] **Step 3: Write the implementation**

Create `src/pdf/ReceiptDocument.tsx`:

```tsx
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { companyHeader, signatureBlock } from './blocks'

function ackRow(label: string, value: string) {
  return (
    <View style={styles.ackRow}>
      <Text style={styles.ackLabel}>{label}</Text>
      <Text style={styles.ackValue}>{value}</Text>
    </View>
  )
}

export function ReceiptDocument({ snapshot }: { snapshot: ReceiptSnapshot }) {
  const receivedOnValue = snapshot.method ? `${snapshot.paidAtLabel}  by ${snapshot.method}` : snapshot.paidAtLabel

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('RECEIPT')}
        <View style={styles.receiptNumberRow}>
          <Text style={styles.receiptNumber}>{snapshot.number}</Text>
        </View>
        <View style={styles.ackBlock}>
          {ackRow('Received with thanks from', snapshot.customerName)}
          {ackRow('the sum of', snapshot.amountLabel)}
          {ackRow('being', `${snapshot.kindLabel} for ${snapshot.ref}`)}
          {ackRow('received on', receivedOnValue)}
          {snapshot.balanceRemainingLabel !== null && ackRow('Balance remaining', snapshot.balanceRemainingLabel)}
        </View>
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderReceiptPdf(snapshot: ReceiptSnapshot): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument snapshot={snapshot} />)
}
```

Add these styles to `src/pdf/styles.ts`, in a new section after "Signature block" and before `footerThanks`:

```ts
  // Receipt body
  receiptNumberRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  receiptNumber: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  ackBlock: {
    marginTop: 20,
    gap: 10,
  },
  ackRow: {
    flexDirection: 'row',
  },
  ackLabel: {
    width: 160,
    fontSize: 10,
    color: '#333333',
  },
  ackValue: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
  },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pdf/ReceiptDocument.test.tsx`
Expected: PASS, 7 tests

- [ ] **Step 5: Stage and commit (after user review)**

```bash
git add src/pdf/ReceiptDocument.tsx src/pdf/ReceiptDocument.test.tsx src/pdf/styles.ts
git commit -m "feat: add the receipt document PDF"
```

---

### Task 11: Generate, download and send order documents and receipts

Wires the order and receipt PDFs into the documents and payments screens — the same generate/store/download/email path Slice 1 built for quotations, extended to two more kinds.

**Files:**
- Modify: `src/app/admin/(protected)/jobs/[id]/documents/actions.ts`
- Modify: `src/app/admin/(protected)/jobs/[id]/documents/page.tsx`
- Modify: `src/app/admin/(protected)/jobs/[id]/documents/DocumentRow.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/documents/GenerateOrderPdfButton.tsx`
- Modify: `src/app/admin/(protected)/jobs/[id]/payments/PaymentRow.tsx` (replace the stubbed button)
- Modify: `src/app/admin/(protected)/jobs/[id]/payments/actions.ts` (add `generateReceipt`)

**Interfaces:**
- Consumes: `buildOrderSnapshot`, `buildReceiptSnapshot` from `@/lib/jobs/snapshot`; `renderOrderPdf` from `@/pdf/OrderDocument`; `renderReceiptPdf` from `@/pdf/ReceiptDocument`; `formatReceiptNumber` from `@/lib/jobs/reference`; `getJobBalance`, `listPayments` from `@/lib/jobs/queries`
- Produces: Server Actions `generateOrderDocument`, `generateReceipt`

- [ ] **Step 1: Add `generateOrderDocument` to the documents actions**

Add to `src/app/admin/(protected)/jobs/[id]/documents/actions.ts`, alongside the existing imports:

```ts
import { getJobBalance } from '@/lib/jobs/queries'
import { buildOrderSnapshot } from '@/lib/jobs/snapshot'
import { renderOrderPdf } from '@/pdf/OrderDocument'
```

```ts
/** Refuses outside stage 'order' or while any unit is unresolved — the same
 *  invariant setJobStage enforces when confirming, checked again here because a
 *  document generator must never trust that the caller already checked. Reuses the
 *  job's own ref, never allocating a new number — see buildOrderSnapshot's doc
 *  comment. */
export async function generateOrderDocument(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  if (!jobId) return { error: 'Missing job id.' }

  const loaded = await loadJob(jobId)
  if (!loaded) return { error: 'Quotation not found.' }
  if (loaded.job.stage !== 'order') return { error: 'Confirm this quotation as an order first.' }

  const balance = await getJobBalance(jobId)
  if (!balance || !balance.totals) return { error: 'Every unit needs a chosen option before an order document can be generated.' }

  const snapshot = buildOrderSnapshot({
    ref: loaded.job.ref,
    quotationDate: loaded.job.quotationDate,
    confirmedDate: loaded.job.confirmedAt ? loaded.job.confirmedAt.toISOString().slice(0, 10) : loaded.job.quotationDate,
    salesPerson: loaded.job.salesPerson,
    customer: {
      name: loaded.customer.name,
      phone: loaded.customer.phone,
      email: loaded.customer.email,
      addressLines: loaded.customer.addressLines ?? [],
      city: loaded.customer.city,
      district: loaded.customer.district,
    },
    units: loaded.units,
    discountLabel: loaded.job.discountLabel,
    discountCents: loaded.job.discountCents,
    freeDelivery: loaded.job.freeDelivery,
    deliveryChargeCents: loaded.job.deliveryChargeCents,
    paymentTerms: loaded.job.paymentTerms,
    payments: balance.payments,
    terms: loaded.terms.map((c) => ({ body: c.body, emphasis: c.emphasis })),
    warranty: loaded.warranty.map((c) => ({ body: c.body, emphasis: c.emphasis })),
  })

  const pdf = await renderOrderPdf(snapshot)
  const blob = await put(`orders/${loaded.job.ref}-${Date.now()}.pdf`, pdf, { access: 'public' })

  await db.insert(jobDocuments).values({
    id: randomUUID(),
    jobId,
    kind: 'order',
    number: loaded.job.ref,
    blobUrl: blob.url,
    snapshot,
  })

  revalidatePath(`/admin/jobs/${jobId}/documents`)
  return { success: true }
}
```

`emailQuotation` already fetches the stored PDF by document id and emails it generically (its subject line reads `Quotation ${number}` — see Step 2 below for making that kind-aware); it does not need a separate `emailOrder`/`emailReceipt` action, since nothing about it is quotation-specific beyond that one string.

- [ ] **Step 2: Make `emailQuotation`'s subject line kind-aware and rename it**

`emailQuotation` already works unchanged for any document kind except its hardcoded subject line. Rename it to `emailDocument` (update every import of it — `DocumentRow.tsx` — to match) and generalize the subject:

```ts
const DOCUMENT_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order confirmation',
  receipt: 'Receipt',
}

export async function emailDocument(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const documentId = String(formData.get('documentId') ?? '')
  if (!documentId) return { error: 'Missing document id.' }

  const [row] = await db
    .select()
    .from(jobDocuments)
    .innerJoin(jobs, eq(jobs.id, jobDocuments.jobId))
    .innerJoin(customers, eq(customers.id, jobs.customerId))
    .where(eq(jobDocuments.id, documentId))
  if (!row) return { error: 'Document not found.' }

  const email = row.customers.email
  if (!email) return { error: 'This customer has no email address on file.' }

  const pdfResponse = await fetch(row.job_documents.blobUrl)
  if (!pdfResponse.ok) return { error: 'Could not fetch the stored PDF.' }
  const pdf = Buffer.from(await pdfResponse.arrayBuffer())

  const label = DOCUMENT_LABELS[row.job_documents.kind] ?? 'Document'
  const { error } = await sendDocumentEmail({
    to: email,
    subject: `${label} ${row.job_documents.number} — Roomy Creations`,
    body: `Hi ${row.customers.name},\n\nPlease find attached your ${label.toLowerCase()} ${row.job_documents.number} from Roomy Creations.\n\nThank you for your business.`,
    filename: `${row.job_documents.number}.pdf`,
    pdf,
  })
  if (error) return { error }

  await db.update(jobDocuments).set({ sentTo: email, sentAt: new Date() }).where(eq(jobDocuments.id, documentId))

  revalidatePath(`/admin/jobs/${row.job_documents.jobId}/documents`)
  return { success: true }
}
```

- [ ] **Step 3: Add `generateReceipt` to the payments actions**

Add to `src/app/admin/(protected)/jobs/[id]/payments/actions.ts`:

```ts
import { randomUUID } from 'crypto'
import { desc, eq, sql } from 'drizzle-orm'
import { put } from '@vercel/blob'
import { customers, jobDocuments, jobs, payments } from '@/db/schema'
import { db } from '@/db/client'
import { formatReceiptNumber } from '@/lib/jobs/reference'
import { buildReceiptSnapshot } from '@/lib/jobs/snapshot'
import { renderReceiptPdf } from '@/pdf/ReceiptDocument'
import { getJobBalance } from '@/lib/jobs/queries'
```

(Merge these into the file's existing imports rather than duplicating; `eq` and `db` may already be imported.)

```ts
/** One receipt per payment, generated on demand rather than automatically — an admin
 *  may record several payments before printing anything, or reprint one later. Always
 *  a fresh row (immutable-snapshot rule): re-generating a receipt for the same
 *  payment produces a second document, not an overwrite. */
export async function generateReceipt(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  const paymentId = String(formData.get('paymentId') ?? '')
  if (!jobId || !paymentId) return { error: 'Missing payment id.' }

  const [job] = await db.select().from(jobs).innerJoin(customers, eq(customers.id, jobs.customerId)).where(eq(jobs.id, jobId))
  if (!job) return { error: 'Quotation not found.' }

  const allPayments = await db.select().from(payments).where(eq(payments.jobId, jobId)).orderBy(desc(payments.createdAt))
  const payment = allPayments.find((p) => p.id === paymentId)
  if (!payment) return { error: 'Payment not found.' }

  const balance = await getJobBalance(jobId)

  // Sequence numbers come from the shared `counters` table, exactly like job refs —
  // see allocateRef in queries.ts for the identical single-statement pattern.
  const counterRows = await db.execute<{ value: number }>(
    sql`update counters set value = value + 1 where key = 'receipt' returning value`,
  )
  const seq = Number(counterRows.rows[0]?.value)
  if (!Number.isInteger(seq)) {
    return { error: "Counter 'receipt' is missing — run npm run db:seed." }
  }

  const snapshot = buildReceiptSnapshot({
    number: formatReceiptNumber(seq),
    ref: job.jobs.ref,
    customerName: job.customers.name,
    amountCents: payment.amountCents,
    kind: payment.kind as 'advance' | 'final' | 'other',
    note: payment.note,
    paidAt: payment.paidAt,
    method: payment.method,
    totalCents: balance?.totals?.totalCents ?? null,
    paymentsIncludingThis: allPayments.filter((p) => p.createdAt <= payment.createdAt),
  })

  const pdf = await renderReceiptPdf(snapshot)
  const blob = await put(`receipts/${snapshot.number}-${Date.now()}.pdf`, pdf, { access: 'public' })

  await db.insert(jobDocuments).values({
    id: randomUUID(),
    jobId,
    kind: 'receipt',
    number: snapshot.number,
    blobUrl: blob.url,
    snapshot,
    paymentId,
  })

  revalidatePath(`/admin/jobs/${jobId}/payments`)
  revalidatePath(`/admin/jobs/${jobId}/documents`)
  return { success: true }
}
```

- [ ] **Step 4: Add the "Generate order document" button**

Create `src/app/admin/(protected)/jobs/[id]/documents/GenerateOrderPdfButton.tsx`:

```tsx
'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { generateOrderDocument, type ActionState } from './actions'

const initialState: ActionState = {}

export function GenerateOrderPdfButton({ jobId }: { jobId: string }) {
  const [state, formAction] = useActionState(generateOrderDocument, initialState)

  useEffect(() => {
    if (state.success) toast.success('Order document generated.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <AdminSubmitButton
        label="Generate order document"
        pendingLabel="Generating"
        className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
```

In `src/app/admin/(protected)/jobs/[id]/documents/page.tsx`, render it next to the existing `GeneratePdfButton`, only once the job is at `stage: 'order'`:

```tsx
      <div className="flex flex-wrap gap-3">
        <GeneratePdfButton jobId={id} />
        {loaded.job.stage === 'order' && <GenerateOrderPdfButton jobId={id} />}
      </div>
```

(Replace the page's current single `<GeneratePdfButton jobId={id} />` line with this block, and add the import `import { GenerateOrderPdfButton } from './GenerateOrderPdfButton'`.)

- [ ] **Step 5: Update `DocumentRow` for the new kinds and the renamed action**

In `src/app/admin/(protected)/jobs/[id]/documents/DocumentRow.tsx`, extend `KIND_LABELS`:

```ts
const KIND_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order',
  receipt: 'Receipt',
  advance_invoice: 'Advance invoice',
  final_invoice: 'Final invoice',
  warranty_card: 'Warranty card',
}
```

Update the import and the `useActionState` call to use the renamed action:

```ts
import { emailDocument, type ActionState } from './actions'
```

```tsx
  const [state, formAction] = useActionState(emailDocument, initialState)
```

- [ ] **Step 6: Wire the receipt button into `PaymentRow`**

Replace `src/app/admin/(protected)/jobs/[id]/payments/PaymentRow.tsx`'s stubbed placeholder with a working button. Add a small client component alongside it, `GenerateReceiptButton`, in the same file:

```tsx
'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { deletePayment, generateReceipt, type ActionState } from './actions'
import { formatCents } from '@/lib/money'

const initialState: ActionState = {}
const KIND_LABELS: Record<string, string> = { advance: 'Advance', final: 'Final', other: 'Other' }

function GenerateReceiptButton({ jobId, paymentId }: { jobId: string; paymentId: string }) {
  const [state, formAction] = useActionState(generateReceipt, initialState)

  useEffect(() => {
    if (state.success) toast.success('Receipt generated — find it on the Documents page.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <AdminSubmitButton
        label="Generate receipt"
        pendingLabel="Generating"
        className="rounded-full border border-navy px-4 py-2 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}

export function PaymentRow({
  id,
  jobId,
  kind,
  amountCents,
  paidAt,
  method,
  note,
}: {
  id: string
  jobId: string
  kind: string
  amountCents: number
  paidAt: string
  method: string | null
  note: string | null
}) {
  return (
    <div data-testid="payment-row" className="flex flex-wrap items-center justify-between gap-4 border border-navy/40 p-4">
      <div>
        <p className="font-display text-navy">
          {formatCents(amountCents)} <span className="u-mono text-xs text-navy/60">({KIND_LABELS[kind] ?? kind})</span>
        </p>
        <p className="u-mono mt-1 text-xs text-navy/60">
          {paidAt}
          {method ? ` · ${method}` : ''}
          {note ? ` · ${note}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <GenerateReceiptButton jobId={jobId} paymentId={id} />
        <form
          action={deletePayment}
          onSubmit={(e) => {
            if (!confirm('Delete this payment?')) e.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="jobId" value={jobId} />
          <button type="submit" className="u-mono text-xs text-navy/60 underline">
            Delete
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Verify end to end in the running app**

Run: `npm run dev`. On a resolved job: record an advance payment, confirm it as an order (from the job header), generate the order document from Documents, download it and confirm it shows ORDER, the job's own ref, the chosen option, Advance Paid, Balance Due and the payment terms sentence. From Payments, generate a receipt for that payment, download it and confirm it shows the receipt number, amount, "advance payment for RC0019X", the date/method and the correct balance remaining. Email both to your own address and confirm they arrive with the right subject lines (`Order confirmation RC0019X` / `Receipt RCP00001`). Then try generating an order document on a job still at `stage: 'quotation'` (e.g. by hitting the action directly is unnecessary — confirm the button is simply absent from the page in that state, which is the actual guard the admin will experience).

- [ ] **Step 8: Update the README**

Add a short paragraph to the existing "Quotations" bullet in `README.md` (added in Slice 1) covering: recording payments, the Confirm order / Revert to quotation actions and their invariant (every unit must resolve first), the order document, and the minimal receipt document. Mention that `npm run db:seed` now also seeds a `receipt` counter.

- [ ] **Step 9: Run the full suite, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: PASS

- [ ] **Step 10: Stage and commit (after user review)**

```bash
git add "src/app/admin/(protected)/jobs/[id]/documents" "src/app/admin/(protected)/jobs/[id]/payments" README.md
git commit -m "feat: generate, download and send order documents and receipts"
```

---

## Self-Review

**Spec coverage.** Walking the Slice 2 spec section by section: "Decisions" (order+receipt as separate documents, manual-but-prompted stage advance, minimal receipt) → Tasks 4, 5, 11; "Data model" (`payments` table, `jobs.payment_terms`/`confirmed_at`, `job_documents.payment_id`, new `documents.kind` values, `receipt` counter) → Task 2; "Pure logic" (`paidTotalCents`, `paymentPosition`) → Task 1; "The order document" → Tasks 7, 8; "The receipt document" → Tasks 9, 10; "PDF composition — the one refactor" → Task 6; "Admin routes" (`/payments` route, Confirm order button, Payments link, `payment_terms` field, gated "Generate order document") → Tasks 3, 4, 5, 11; "Invariants" (cannot confirm unresolved, payment never changes stage, payments never touch status, revert stays available) → Tasks 4, 5 (enforced server-side, not just hidden client-side, per Global Constraints); "Testing" → every pure module and PDF component has a test task, actions/pages verified live per this project's standing convention; "Environment" → none needed, confirmed in the spec and unchanged here.

Deliberately **not** covered here, per the spec's "Deferred by choice": advance/final invoices and the warranty card (Slice 4), customer-portal payment visibility (Slice 3), multi-instalment payment schedules beyond what the `payments` table already accommodates, and automatic balance-due reminders.

**Placeholder scan.** No task contains "TBD," "add error handling," or an unshown code block. An earlier draft of Task 11's Step 3 included a speculative `db.$count(...)` fragment that was never actually used by the rest of the function — removed during self-review in favor of the single `counters` UPDATE ... RETURNING statement already used for every other reference/document number in this codebase (`allocateRef` in `queries.ts`, `formatJobRef`/`formatReceiptNumber`'s callers), which is what the final version of that step now shows directly.

**Type consistency.** `Payment` (Task 1) is the shape both `paymentPosition` (Task 1) and `buildOrderSnapshot`/`buildReceiptSnapshot` (Tasks 7, 9) accept — checked against Task 2's Drizzle `payments` table shape (`amountCents` matches `payments.amountCents`'s `bigint(..., { mode: 'number' })`). `OrderSnapshot`/`ReceiptSnapshot` (Tasks 7, 9) are the exact props `OrderDocument`/`ReceiptDocument` (Tasks 8, 10) accept. `getJobBalance`'s return shape (Task 5: `{ totals, payments, position }`) is consumed identically in the payments page (Task 5) and in `generateOrderDocument`/`generateReceipt` (Task 11) — same field names throughout, no renaming across tasks.
