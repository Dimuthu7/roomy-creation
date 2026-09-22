# Admin Order Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin mark an order complete — warned but never blocked by an outstanding balance — and issue the customer a single completion certificate carrying the delivered items, the full payment record, the warranty and the terms.

**Architecture:** Completion is a `status` transition (`'finished'`) plus a new `jobs.completed_at` stamp, set by a new `completeJob` server action that re-checks every invariant server-side. The certificate follows the three document kinds already in the codebase exactly: a pure snapshot builder wrapping `buildQuotationSnapshot`, a `@react-pdf/renderer` component composed from the shared `blocks.tsx`, and a generator action that stores an immutable row in `job_documents`. Download and email need no new code — the existing `DocumentRow` handles any stored document.

**Tech Stack:** Next.js 16.2.12 (App Router, server actions), Drizzle ORM + Postgres (Neon), `@react-pdf/renderer`, `@vercel/blob`, Resend, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-22-admin-order-completion-design.md`

## Global Constraints

- **Next.js 16.2.12.** This version has breaking changes from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js-specific code. Heed deprecation notices.
- **Never run `git commit`.** Per this repo's `AGENTS.md`, work stops after each task for the user to review; the controller commits only after the user explicitly confirms. Implementers report their changes and stop.
- **Do not create or edit any markdown file.** Same rule, same file. Report in the task report file you were given, nothing else.
- **Money is always integer cents**, formatted for display only via `formatCents` from `@/lib/money`. LKR only, no currency symbol.
- **Snapshots hold pre-formatted display strings, never raw cents.** A snapshot is what the document *said*; a future formatting change must never retroactively alter an issued document.
- **Documents are immutable.** Generators always `insert` a new `job_documents` row; they never `update` an existing one.
- **Server actions re-check every invariant themselves.** Never trust that the caller or the UI already checked.
- **Completion must never touch `jobs.stage` or `jobs.updated_at`.** `updated_at` drives the documents-staleness marker (`doc.createdAt < job.updatedAt` in `documents/page.tsx`); bumping it on a state transition falsely marks every issued document stale.
- **An outstanding balance never blocks completion.** It only shapes a confirm message.
- **UI flows are verified live against the running app, never inside vitest.** Vitest covers pure logic, schemas, server actions and component behaviour.
- **Every task ends with `npm test` and `npm run lint` both clean.**

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `src/db/schema.ts` | Add `jobs.completedAt`; correct two stale comments | 1 |
| `src/db/migrations/0005_*.sql` | Generated migration adding the column | 1 |
| `src/lib/jobs/snapshot.ts` | `buildCompletionSnapshot`, exported `paymentKindLabel` | 2 |
| `src/lib/jobs/snapshot.test.ts` | Snapshot builder tests | 2 |
| `src/pdf/styles.ts` | Payment-ledger styles | 3 |
| `src/pdf/blocks.tsx` | Shared `paymentLedger` block | 3 |
| `src/pdf/CompletionDocument.tsx` | The certificate PDF | 3 |
| `src/pdf/CompletionDocument.test.tsx` | Document-tree assertions | 3 |
| `src/app/admin/(protected)/jobs/actions.ts` | `completeJob` server action | 4 |
| `src/app/admin/(protected)/jobs/actions.test.ts` | `completeJob` guard tests | 4 |
| `src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.tsx` | Button + balance-aware confirm | 5 |
| `src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.test.tsx` | Confirm-message tests | 5 |
| `src/app/admin/(protected)/jobs/[id]/page.tsx` | Wire the button, load the balance | 5 |
| `src/app/admin/(protected)/jobs/[id]/documents/actions.ts` | `generateCompletionDocument`, label map | 6 |
| `src/app/admin/(protected)/jobs/[id]/documents/actions.test.ts` | Generator guard tests | 6 |
| `src/app/admin/(protected)/jobs/[id]/documents/GenerateCompletionPdfButton.tsx` | Generate button | 6 |
| `src/app/admin/(protected)/jobs/[id]/documents/page.tsx` | Wire the button | 6 |
| `src/app/admin/(protected)/jobs/[id]/documents/DocumentRow.tsx` | Client-side kind label | 6 |

---

### Task 1: Schema column and migration

**Files:**
- Modify: `src/db/schema.ts:110-128` (the `jobs` table)
- Modify: `src/db/schema.ts:258` (the `job_documents.kind` comment)
- Create: `src/db/migrations/0005_*.sql` (generated, name assigned by drizzle-kit)

**Interfaces:**
- Consumes: nothing.
- Produces: `jobs.completedAt` — a nullable `timestamp` column, read by Tasks 4, 5 and 6 as `job.completedAt: Date | null`.

- [ ] **Step 1: Add the column**

In `src/db/schema.ts`, in the `jobs` table, immediately after the `confirmedAt` column and its comment, add:

```ts
    // Set by the Complete order action, cleared by nothing — a status reversal leaves
    // it in place and a re-completion re-stamps it, so it always names the current
    // completion rather than the first one. Mirrors confirmedAt exactly.
    completedAt: timestamp('completed_at'),
```

- [ ] **Step 2: Correct the two stale comments**

The `jobs.status` comment omits `'cancelled'`, which `JOB_STATUSES` has carried since Slice 1. Change line 111 from:

```ts
    status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'finished'
```

to:

```ts
    status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'finished' | 'cancelled'
```

The `job_documents.kind` comment reserves `'warranty_card'`; this plan's certificate is what that value was for. Change line 258 from:

```ts
    kind: text('kind').notNull(), // 'quotation' | 'order' | 'receipt' | 'advance_invoice' | 'final_invoice' | 'warranty_card'
```

to:

```ts
    kind: text('kind').notNull(), // 'quotation' | 'order' | 'receipt' | 'completion' | 'advance_invoice' | 'final_invoice'
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new file under `src/db/migrations/` containing `ALTER TABLE "jobs" ADD COLUMN "completed_at" timestamp;` and nothing else.

Read the generated SQL and confirm it contains exactly that one `ALTER TABLE ... ADD COLUMN` statement. If it contains anything destructive (a `DROP`, a type change, a `NOT NULL` without a default), stop and report — that means `schema.ts` had drifted from the migrations folder before this change, which is not this task's problem to fix silently.

- [ ] **Step 4: Apply the migration**

Run: `npm run db:migrate`
Expected: applies cleanly.

If `DATABASE_URL` is not set in `.env.local`, this fails with a connection error. That is not a task failure — report `DONE_WITH_CONCERNS` noting the migration is generated but unapplied, and let the controller hand it to the user.

- [ ] **Step 5: Verify nothing broke**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all clean. No test changes are needed for an additive nullable column; the suite passing is the guard.

---

### Task 2: The completion snapshot builder

**Files:**
- Modify: `src/lib/jobs/snapshot.ts` (append after `buildReceiptSnapshot`; also export the existing kind-label helper)
- Modify: `src/lib/jobs/snapshot.test.ts`

**Interfaces:**
- Consumes: `buildQuotationSnapshot`, `SnapshotInput`, `QuotationSnapshot`, `SnapshotPaymentPosition` (all already in `snapshot.ts`); `paymentPosition` and `Payment` from `./payments`; `jobTotals` from `./totals`; `formatCents` from `@/lib/money`.
- Produces:
  - `paymentKindLabel(kind: 'advance' | 'final' | 'other', note: string | null | undefined): string` — the existing private `receiptKindLabel`, now exported under a neutral name.
  - `CompletionSnapshotPayment`, `CompletionSnapshot`, `CompletionSnapshotInput` interfaces.
  - `buildCompletionSnapshot(input: CompletionSnapshotInput): CompletionSnapshot` — consumed by Tasks 3 and 6.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/jobs/snapshot.test.ts`. Note the import line at the top of that file must gain `buildCompletionSnapshot` and the type `CompletionSnapshotInput`.

```ts
describe('buildCompletionSnapshot', () => {
  const BASE: CompletionSnapshotInput = {
    ref: 'RC00188',
    number: 'WC00001',
    quotationDate: '2026-03-21',
    confirmedDate: '2026-04-02',
    completedDate: '2026-09-22',
    salesPerson: 'ISHAN',
    customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: [], city: null, district: null },
    units: [
      {
        title: 'Unit 01',
        options: [{ label: null, priceCents: 300_000_00, qty: 1, selected: true, specs: [] }],
      },
    ],
    discountLabel: 'Cash Discount',
    discountCents: 0,
    freeDelivery: false,
    deliveryChargeCents: null,
    terms: [{ body: 'A term.', emphasis: false }],
    warranty: [{ body: 'A warranty clause.', emphasis: true }],
    payments: [
      // Deliberately newest-first, as listPayments returns them.
      { amountCents: 200_000_00, paidAt: '2026-02-01', kind: 'final', method: 'Cash', note: null, createdAt: new Date('2026-02-01T00:00:00Z') },
      { amountCents: 100_000_00, paidAt: '2026-01-01', kind: 'advance', method: 'Bank transfer', note: null, createdAt: new Date('2026-01-01T00:00:00Z') },
    ],
  }

  it('carries its own WC number alongside the job ref, not instead of it', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.number).toBe('WC00001')
    expect(snapshot.ref).toBe('RC00188')
  })

  it('keeps the quotation body — units, totals, terms and warranty', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.units[0].title).toBe('Unit 01')
    expect(snapshot.totals?.totalLabel).toBe('300,000.00')
    expect(snapshot.terms).toEqual([{ body: 'A term.', emphasis: false }])
    expect(snapshot.warranty).toEqual([{ body: 'A warranty clause.', emphasis: true }])
  })

  it('prints the payment ledger oldest-first, however the input was ordered', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.payments.map((p) => p.paidAtLabel)).toEqual(['2026-01-01', '2026-02-01'])
  })

  it('labels each payment with the same wording the receipt uses, capitalised for a table', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.payments[0].kindLabel).toBe('Advance payment')
    expect(snapshot.payments[1].kindLabel).toBe('Final payment')
  })

  it("uses an 'other' payment's note as its label, falling back to a generic word", () => {
    const withOther = buildCompletionSnapshot({
      ...BASE,
      payments: [
        { amountCents: 1_000_00, paidAt: '2026-01-05', kind: 'other', method: null, note: 'Site visit fee', createdAt: new Date('2026-01-05T00:00:00Z') },
        { amountCents: 2_000_00, paidAt: '2026-01-06', kind: 'other', method: null, note: null, createdAt: new Date('2026-01-06T00:00:00Z') },
      ],
    })
    expect(withOther.payments[0].kindLabel).toBe('Site visit fee')
    expect(withOther.payments[1].kindLabel).toBe('Payment')
  })

  it('formats amounts and carries the method through', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.payments[0].amountLabel).toBe('100,000.00')
    expect(snapshot.payments[0].method).toBe('Bank transfer')
  })

  it('reports a settled position when the payments cover the total', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.paymentPosition).toEqual({ paidLabel: '300,000.00', balanceLabel: '0.00' })
  })

  it('reports a positive balance rather than hiding it, so a certificate never conceals an unpaid amount', () => {
    const snapshot = buildCompletionSnapshot({ ...BASE, payments: [BASE.payments[1]] })
    expect(snapshot.paymentPosition).toEqual({ paidLabel: '100,000.00', balanceLabel: '200,000.00' })
  })

  it('reports an overpayment as a negative balance rather than clamping it to zero', () => {
    const overpaid = buildCompletionSnapshot({
      ...BASE,
      payments: [{ amountCents: 350_000_00, paidAt: '2026-01-01', kind: 'final', method: null, note: null, createdAt: new Date('2026-01-01T00:00:00Z') }],
    })
    expect(overpaid.paymentPosition?.balanceLabel).toBe('-50,000.00')
  })

  it('has a null position when a unit is still unresolved, since no total exists to settle against', () => {
    const unresolved = buildCompletionSnapshot({
      ...BASE,
      units: [
        {
          title: 'Unit 01',
          options: [
            { label: 'A', priceCents: 100_00, qty: 1, selected: false, specs: [] },
            { label: 'B', priceCents: 200_00, qty: 1, selected: false, specs: [] },
          ],
        },
      ],
    })
    expect(unresolved.totals).toBeNull()
    expect(unresolved.paymentPosition).toBeNull()
  })

  it('carries both dates, so the certificate can state how long the job took', () => {
    const snapshot = buildCompletionSnapshot(BASE)
    expect(snapshot.confirmedDate).toBe('2026-04-02')
    expect(snapshot.completedDate).toBe('2026-09-22')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: FAIL — `buildCompletionSnapshot is not a function` / TypeScript cannot find the export.

- [ ] **Step 3: Export the shared kind label**

In `src/lib/jobs/snapshot.ts`, rename the private `receiptKindLabel` to an exported `paymentKindLabel`, leaving the body unchanged, and update `buildReceiptSnapshot`'s single call site:

```ts
/** Shared by the receipt (inline in a sentence) and the completion certificate's
 *  ledger (capitalised at the call site). One function so "advance payment" can never
 *  come to mean two different things on two documents the same customer holds. */
export function paymentKindLabel(kind: ReceiptSnapshotInput['kind'], note: string | null | undefined): string {
  if (kind === 'advance') return 'advance payment'
  if (kind === 'final') return 'final payment'
  return note && note.trim() !== '' ? note : 'payment'
}
```

In `buildReceiptSnapshot`, change `kindLabel: receiptKindLabel(input.kind, input.note)` to `kindLabel: paymentKindLabel(input.kind, input.note)`.

- [ ] **Step 4: Write the builder**

Append to `src/lib/jobs/snapshot.ts`:

```ts
export interface CompletionSnapshotPayment {
  paidAtLabel: string
  kindLabel: string
  method: string | null
  amountLabel: string
}

export interface CompletionSnapshot extends QuotationSnapshot {
  /** The certificate's own WC number. `ref` still carries the job's RC number. */
  number: string
  confirmedDate: string
  completedDate: string
  payments: CompletionSnapshotPayment[]
  paymentPosition: SnapshotPaymentPosition | null
}

/** `createdAt` is used only to break ties between two payments dated the same day;
 *  it is deliberately not carried into the snapshot, which must survive JSON. */
export interface CompletionSnapshotPaymentInput extends Payment {
  paidAt: string
  kind: 'advance' | 'final' | 'other'
  method: string | null
  note: string | null
  createdAt: Date
}

export interface CompletionSnapshotInput extends SnapshotInput {
  number: string
  confirmedDate: string
  completedDate: string
  payments: CompletionSnapshotPaymentInput[]
}

/** A table cell reads wrong in lower case, but the wording itself must stay identical
 *  to the receipt's — so the shared label is capitalised here rather than duplicated. */
function capitalise(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Wraps buildQuotationSnapshot the way buildOrderSnapshot does: the certificate's
 *  body is the quotation's body (items, totals, terms, warranty) plus a payment
 *  ledger, a position, and the two dates that bracket the job. Unlike the order
 *  document it DOES carry a number of its own — a warranty instrument is quoted by
 *  its own number years later, which is why Slice 1 reserved the WC series. */
export function buildCompletionSnapshot(input: CompletionSnapshotInput): CompletionSnapshot {
  const quotation = buildQuotationSnapshot(input)
  const totals = jobTotals({
    units: input.units,
    discountCents: input.discountCents,
    freeDelivery: input.freeDelivery,
    deliveryChargeCents: input.deliveryChargeCents,
  })
  const position = paymentPosition(totals?.totalCents ?? null, input.payments)

  // listPayments returns newest-first, which is right for a working screen and wrong
  // for a handover document — a statement reads forwards. Sorted here rather than at
  // the call site so every caller gets the same order. paidAt is 'YYYY-MM-DD', which
  // compares correctly as a plain string.
  const ordered = [...input.payments].sort(
    (a, b) => a.paidAt.localeCompare(b.paidAt) || a.createdAt.getTime() - b.createdAt.getTime(),
  )

  return {
    ...quotation,
    number: input.number,
    confirmedDate: input.confirmedDate,
    completedDate: input.completedDate,
    payments: ordered.map((payment) => ({
      paidAtLabel: payment.paidAt,
      kindLabel: capitalise(paymentKindLabel(payment.kind, payment.note)),
      method: payment.method,
      amountLabel: formatCents(payment.amountCents),
    })),
    paymentPosition: position
      ? { paidLabel: formatCents(position.paidCents), balanceLabel: formatCents(position.balanceCents) }
      : null,
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/jobs/snapshot.test.ts`
Expected: PASS, including the pre-existing receipt tests — `paymentKindLabel`'s rename must not change any receipt behaviour.

- [ ] **Step 6: Full suite and lint**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all clean. Then stop for review — do not commit.

---

### Task 3: The completion certificate PDF

**Files:**
- Modify: `src/pdf/styles.ts` (append a "Payment ledger" section before `footerThanks`)
- Modify: `src/pdf/blocks.tsx` (append `paymentLedger`)
- Create: `src/pdf/CompletionDocument.tsx`
- Create: `src/pdf/CompletionDocument.test.tsx`

**Interfaces:**
- Consumes: `CompletionSnapshot` from Task 2; `companyHeader`, `clientAndMetaBlock`, `tableHeader`, `unitRows`, `deliveryRow`, `totalsBlock`, `clauseList`, `signatureBlock` from `./blocks`; `styles` from `./styles`.
- Produces: `CompletionDocument({ snapshot })` and `renderCompletionPdf(snapshot): Promise<Buffer>` — consumed by Task 6.

**Critical convention:** sub-sections in `blocks.tsx` are plain functions called as `{section()}`, never JSX tags like `<Section />`. The tree-walking tests read `element.props.children` directly with no render pass, so a `<Section />` tag would be an unevaluated reference and its text would never appear. Follow the existing files exactly.

- [ ] **Step 1: Write the failing test**

Create `src/pdf/CompletionDocument.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { CompletionDocument } from './CompletionDocument'
import type { CompletionSnapshot } from '@/lib/jobs/snapshot'

const SNAPSHOT: CompletionSnapshot = {
  number: 'WC00001',
  ref: 'RC00188',
  quotationDate: '2026-03-21',
  confirmedDate: '2026-04-02',
  completedDate: '2026-09-22',
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
  payments: [
    { paidAtLabel: '2026-01-01', kindLabel: 'Advance payment', method: 'Bank transfer', amountLabel: '100,000.00' },
    { paidAtLabel: '2026-02-01', kindLabel: 'Final payment', method: 'Cash', amountLabel: '135,000.00' },
  ],
  paymentPosition: { paidLabel: '235,000.00', balanceLabel: '0.00' },
  terms: [{ body: 'Delivery within 15 to 30 days.', emphasis: false }],
  warranty: [{ body: 'Five year warranty on structure.', emphasis: true }],
}

function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { props?: { children?: unknown } }
  return element.props ? textOf(element.props.children) : ''
}

describe('CompletionDocument', () => {
  it('titles itself COMPLETION CERTIFICATE', () => {
    expect(textOf(CompletionDocument({ snapshot: SNAPSHOT }))).toContain('COMPLETION CERTIFICATE')
  })

  it('prints its own WC number and the job ref as a cross-reference', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('WC00001')
    expect(text).toContain('RC00188')
  })

  it('prints both the confirmed and completed dates', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('2026-04-02')
    expect(text).toContain('2026-09-22')
  })

  it('lists the delivered items, so a later warranty claim shows what is covered', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Unite 01- Cupboards With Doors')
    expect(text).toContain('235,000.00')
  })

  it('prints every payment with its date, kind, method and amount', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('2026-01-01')
    expect(text).toContain('Advance payment')
    expect(text).toContain('Bank transfer')
    expect(text).toContain('100,000.00')
    expect(text).toContain('Final payment')
    expect(text).toContain('Cash')
  })

  it('prints the paid and balance position', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Total Paid')
    expect(text).toContain('Balance')
  })

  it('states an outstanding balance plainly rather than hiding it', () => {
    const owing: CompletionSnapshot = {
      ...SNAPSHOT,
      paymentPosition: { paidLabel: '100,000.00', balanceLabel: '135,000.00' },
    }
    expect(textOf(CompletionDocument({ snapshot: owing }))).toContain('135,000.00')
  })

  it('prints the warranty and the terms', () => {
    const text = textOf(CompletionDocument({ snapshot: SNAPSHOT }))
    expect(text).toContain('Warranty')
    expect(text).toContain('Five year warranty on structure.')
    expect(text).toContain('Terms & Conditions')
    expect(text).toContain('Delivery within 15 to 30 days.')
  })

  it('renders without a payment position when the job never resolved', () => {
    const text = textOf(CompletionDocument({ snapshot: { ...SNAPSHOT, paymentPosition: null, totals: null } }))
    expect(text).toContain('COMPLETION CERTIFICATE')
    expect(text).not.toContain('Total Paid')
  })

  it('keeps the standing footer copy', () => {
    expect(textOf(CompletionDocument({ snapshot: SNAPSHOT }))).toContain('Thank You For Your Business!')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pdf/CompletionDocument.test.tsx`
Expected: FAIL — cannot resolve `./CompletionDocument`.

- [ ] **Step 3: Add the ledger styles**

In `src/pdf/styles.ts`, insert before the `footerThanks` entry:

```ts
  // Payment ledger (completion certificate)
  ledgerHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eeeeee',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  ledgerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  ledgerCellDate: {
    width: 80,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  ledgerCellKind: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  ledgerCellMethod: {
    width: 100,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  ledgerCellAmount: {
    width: 90,
    padding: 5,
    textAlign: 'right',
  },
```

- [ ] **Step 4: Add the shared ledger block**

Append to `src/pdf/blocks.tsx`. Add `CompletionSnapshot` to the existing `import type { ... } from '@/lib/jobs/snapshot'` line.

```tsx
/** The completion certificate's payment history. Returns null for a job with no
 *  payments at all rather than printing an empty table — a certificate for an unpaid
 *  job is unusual but not impossible, and an empty bordered box reads like a bug. */
export function paymentLedger(
  payments: CompletionSnapshot['payments'],
  position: CompletionSnapshot['paymentPosition'],
  totalLabel: string | null,
) {
  if (payments.length === 0 && position === null) return null
  return (
    <View>
      <Text style={styles.sectionHeading}>Payment Details</Text>
      {payments.length > 0 && (
        <View style={styles.table}>
          <View style={styles.ledgerHeaderRow}>
            <View style={styles.ledgerCellDate}>
              <Text style={styles.headerCellText}>DATE</Text>
            </View>
            <View style={styles.ledgerCellKind}>
              <Text style={styles.headerCellText}>PAYMENT</Text>
            </View>
            <View style={styles.ledgerCellMethod}>
              <Text style={styles.headerCellText}>METHOD</Text>
            </View>
            <View style={styles.ledgerCellAmount}>
              <Text style={styles.headerCellText}>AMOUNT</Text>
            </View>
          </View>
          {payments.map((payment, i) => (
            <View key={i} style={styles.ledgerRow}>
              <View style={styles.ledgerCellDate}>
                <Text>{payment.paidAtLabel}</Text>
              </View>
              <View style={styles.ledgerCellKind}>
                <Text>{payment.kindLabel}</Text>
              </View>
              <View style={styles.ledgerCellMethod}>
                <Text>{payment.method ?? '-'}</Text>
              </View>
              <View style={styles.ledgerCellAmount}>
                <Text>{payment.amountLabel}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      {position && (
        <View style={styles.totalsBlock}>
          {totalLabel !== null && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Order Total</Text>
              <Text style={styles.totalsValue}>{totalLabel}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total Paid</Text>
            <Text style={styles.totalsValue}>{position.paidLabel}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text style={styles.totalsLabelFinal}>Balance</Text>
            <Text style={styles.totalsValueFinal}>{position.balanceLabel}</Text>
          </View>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 5: Write the document**

Create `src/pdf/CompletionDocument.tsx`:

```tsx
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { CompletionSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, paymentLedger, signatureBlock, tableHeader, totalsBlock, unitRows } from './blocks'

/** Both dates appear because the pair states how long the job took, which is the
 *  first question a warranty claim asks. ORDER carries the job's RC ref so the
 *  certificate can be tied back to the order document the customer already holds. */
function metaFields(snapshot: CompletionSnapshot) {
  return [
    { label: 'COMPLETED', value: snapshot.completedDate },
    { label: 'ORDER', value: snapshot.ref },
    { label: 'CONFIRMED', value: snapshot.confirmedDate },
    { label: 'SALES PERSON', value: snapshot.salesPerson ?? '-' },
  ]
}

export function CompletionDocument({ snapshot }: { snapshot: CompletionSnapshot }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('COMPLETION CERTIFICATE')}
        <View style={styles.receiptNumberRow}>
          <Text style={styles.receiptNumber}>{snapshot.number}</Text>
        </View>
        {clientAndMetaBlock(metaFields(snapshot), snapshot.customer)}
        <Text style={styles.sectionHeading}>Items Delivered</Text>
        <View style={styles.table}>
          {tableHeader()}
          {snapshot.units.map((unit, i) => unitRows(unit, i))}
        </View>
        {deliveryRow(snapshot.delivery)}
        {totalsBlock(snapshot.totals)}
        {paymentLedger(snapshot.payments, snapshot.paymentPosition, snapshot.totals?.totalLabel ?? null)}
        <Text style={styles.tagline}>
          Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard
        </Text>
        {clauseList('Warranty', snapshot.warranty)}
        {clauseList('Terms & Conditions', snapshot.terms)}
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderCompletionPdf(snapshot: CompletionSnapshot): Promise<Buffer> {
  return renderToBuffer(<CompletionDocument snapshot={snapshot} />)
}
```

Note the section order: **Warranty before Terms**, the reverse of the quotation and order documents. The warranty is what this document is *for*; the terms are supporting matter.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/pdf/CompletionDocument.test.tsx`
Expected: PASS.

- [ ] **Step 7: Run the other PDF tests unmodified**

Run: `npx vitest run src/pdf/`
Expected: PASS. `QuotationDocument.test.tsx`, `OrderDocument.test.tsx` and `ReceiptDocument.test.tsx` must pass **without modification** — they are the correctness guard for the `blocks.tsx` and `styles.ts` additions.

- [ ] **Step 8: Full suite and lint**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all clean. Then stop for review — do not commit.

---

### Task 4: The completeJob server action

**Files:**
- Modify: `src/app/admin/(protected)/jobs/actions.ts` (append after `setJobStage`)
- Create: `src/app/admin/(protected)/jobs/actions.test.ts`

**Interfaces:**
- Consumes: `verifyAdminSession`, `db`, `jobs`, `loadJob` from `@/lib/jobs/queries`, `jobTotals` from `@/lib/jobs/totals` — all already imported in this file.
- Produces: `completeJob(formData: FormData): Promise<void>` — a plain void form action taking a single `id` field. Consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

Create `src/app/admin/(protected)/jobs/actions.test.ts`. The mocking pattern mirrors `[id]/payments/actions.test.ts` — read that file first; it is the established pattern for server-action tests in this area.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const loadJob = vi.fn()
vi.mock('@/lib/jobs/queries', () => ({ loadJob, allocateRef: vi.fn() }))

const updateSet = vi.fn()
const updateWhere = vi.fn().mockResolvedValue(undefined)
vi.mock('@/db/client', () => ({
  db: {
    update: vi.fn(() => ({ set: (...args: unknown[]) => { updateSet(...args); return { where: updateWhere } } })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    select: vi.fn(),
  },
}))

/** A job whose single unit has one option: jobTotals resolves, so completion is
 *  allowed on every axis except the one each test deliberately breaks. */
function completableJob(overrides: Record<string, unknown> = {}) {
  return {
    job: {
      id: 'job-1',
      stage: 'order',
      status: 'in_progress',
      discountCents: 0,
      freeDelivery: false,
      deliveryChargeCents: null,
      ...overrides,
    },
    units: [{ title: 'Unit 01', options: [{ label: null, priceCents: 100_000_00, qty: 1, selected: true, specs: [] }] }],
    customer: {},
    terms: [],
    warranty: [],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('completeJob', () => {
  it('sets status to finished and stamps completedAt', async () => {
    loadJob.mockResolvedValue(completableJob())
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).toHaveBeenCalledTimes(1)
    const patch = updateSet.mock.calls[0][0]
    expect(patch.status).toBe('finished')
    expect(patch.completedAt).toBeInstanceOf(Date)
  })

  it('never touches stage or updatedAt — completion is a transition, not a content edit, and bumping updatedAt would falsely mark every issued document stale', async () => {
    loadJob.mockResolvedValue(completableJob())
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    const patch = updateSet.mock.calls[0][0]
    expect(patch).not.toHaveProperty('stage')
    expect(patch).not.toHaveProperty('updatedAt')
  })

  it('refuses a job still in the quotation stage', async () => {
    loadJob.mockResolvedValue(completableJob({ stage: 'quotation' }))
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses a cancelled job — that is abandoned, not completed', async () => {
    loadJob.mockResolvedValue(completableJob({ status: 'cancelled' }))
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses a job with an unresolved unit, the same invariant confirming enforces', async () => {
    const unresolved = completableJob()
    unresolved.units = [
      {
        title: 'Unit 01',
        options: [
          { label: 'A', priceCents: 100_00, qty: 1, selected: false, specs: [] },
          { label: 'B', priceCents: 200_00, qty: 1, selected: false, specs: [] },
        ],
      },
    ]
    loadJob.mockResolvedValue(unresolved)
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses a missing job', async () => {
    loadJob.mockResolvedValue(null)
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses with no id, without touching the database', async () => {
    const { completeJob } = await import('./actions')

    await completeJob(new FormData())

    expect(loadJob).not.toHaveBeenCalled()
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('completes even with an outstanding balance — the balance warns in the UI, it never gates the action', async () => {
    loadJob.mockResolvedValue(completableJob())
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    // No payment data was provided to the action at all, which is the point: it does
    // not read the balance, so it cannot be blocked by one.
    expect(updateSet).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/admin/(protected)/jobs/actions.test.ts"`
Expected: FAIL — `completeJob` is not exported.

- [ ] **Step 3: Write the action**

Append to `src/app/admin/(protected)/jobs/actions.ts`, directly after `setJobStage`:

```ts
/** Marks a confirmed order finished. Deliberately reuses `status` rather than adding a
 *  third `stage` value: `status` already carries exactly this meaning, and two fields
 *  that must never disagree is a worse problem than one field with four values.
 *
 *  Refuses — silently, like setJobStage — a job that is not an order, is cancelled, or
 *  still has an unresolved unit. It does NOT read the job's balance: an outstanding
 *  amount warns in the UI (see CompleteOrderButton) but never gates completion, because
 *  Roomy Creations genuinely completes installations with money still owed.
 *
 *  Sets no `updatedAt`. That column drives the documents-staleness marker, and
 *  completing a job is a state transition, not a content edit — the same reasoning that
 *  removed it from setJobStage. */
export async function completeJob(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  const loaded = await loadJob(id)
  if (!loaded) return
  if (loaded.job.stage !== 'order') return
  if (loaded.job.status === 'cancelled') return

  const totals = jobTotals({
    units: loaded.units,
    discountCents: loaded.job.discountCents,
    freeDelivery: loaded.job.freeDelivery,
    deliveryChargeCents: loaded.job.deliveryChargeCents,
  })
  if (totals === null) return

  await db.update(jobs).set({ status: 'finished', completedAt: new Date() }).where(eq(jobs.id, id))

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${id}`)
  revalidatePath(`/admin/jobs/${id}/documents`)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "src/app/admin/(protected)/jobs/actions.test.ts"`
Expected: PASS, all eight.

- [ ] **Step 5: Full suite and lint**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all clean. Then stop for review — do not commit.

---

### Task 5: The Complete order button

**Files:**
- Create: `src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.tsx`
- Create: `src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.test.tsx`
- Modify: `src/app/admin/(protected)/jobs/[id]/page.tsx`

**Interfaces:**
- Consumes: `completeJob` from `../actions` (Task 4); `AdminSubmitButton` from `@/components/admin/AdminSubmitButton`; `formatCents` from `@/lib/money`; `getJobBalance` from `@/lib/jobs/queries`.
- Produces: `CompleteOrderButton({ jobId, balanceCents, completedAt })`.

`AdminSubmitButton` already accepts `label`, `pendingLabel`, `className`, `disabled`, `spinnerSize`, `ariaLabel`, `title`. No change to it is needed.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompleteOrderButton } from './CompleteOrderButton'

vi.mock('../actions', () => ({ completeJob: vi.fn() }))

let confirmSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => {
  confirmSpy.mockRestore()
})

describe('CompleteOrderButton', () => {
  it('names the outstanding amount when a balance is owed', async () => {
    const user = userEvent.setup()
    render(<CompleteOrderButton jobId="job-1" balanceCents={125_000_00} completedAt={null} />)

    await user.click(screen.getByRole('button', { name: /complete order/i }))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('125,000.00'))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('pending payment'))
  })

  it('asks plainly when the order is paid in full', async () => {
    const user = userEvent.setup()
    render(<CompleteOrderButton jobId="job-1" balanceCents={0} completedAt={null} />)

    await user.click(screen.getByRole('button', { name: /complete order/i }))

    const message = confirmSpy.mock.calls[0][0] as string
    expect(message).toContain('Complete this order?')
    expect(message).not.toContain('pending payment')
  })

  it('calls out an overpayment rather than folding it into "paid in full"', async () => {
    const user = userEvent.setup()
    render(<CompleteOrderButton jobId="job-1" balanceCents={-5_000_00} completedAt={null} />)

    await user.click(screen.getByRole('button', { name: /complete order/i }))

    const message = confirmSpy.mock.calls[0][0] as string
    expect(message).toContain('overpaid')
    expect(message).toContain('5,000.00')
  })

  it('renders the completion date instead of a button once the job is finished', () => {
    render(<CompleteOrderButton jobId="job-1" balanceCents={0} completedAt="2026-09-22T10:30:00.000Z" />)

    expect(screen.queryByRole('button', { name: /complete order/i })).not.toBeInTheDocument()
    expect(screen.getByText(/completed on/i)).toBeInTheDocument()
  })

  it('renders nothing when the job has no resolved total to settle against', () => {
    const { container } = render(<CompleteOrderButton jobId="job-1" balanceCents={null} completedAt={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.test.tsx"`
Expected: FAIL — cannot resolve `./CompleteOrderButton`.

- [ ] **Step 3: Write the component**

Create `src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.tsx`:

```tsx
'use client'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { formatCents } from '@/lib/money'
import { completeJob } from '../actions'

/** The balance shapes the confirm message and nothing else — `completeJob` never reads
 *  it, so a client that skipped this dialog still completes the job. That is correct:
 *  the warning is an aid to the admin, not an invariant.
 *
 *  An overpayment is called out separately rather than folded into "paid in full", for
 *  the same reason paymentPosition refuses to clamp its balance at zero: it is a real
 *  bookkeeping problem, and completion is the last good moment to notice it. */
function confirmMessage(balanceCents: number): string {
  if (balanceCents > 0) {
    return `There is a pending payment of LKR ${formatCents(balanceCents)} on this order. Complete it anyway?`
  }
  if (balanceCents < 0) {
    return `This order is overpaid by LKR ${formatCents(-balanceCents)}. Complete it anyway?`
  }
  return 'Complete this order? You can then issue the completion certificate.'
}

export function CompleteOrderButton({
  jobId,
  balanceCents,
  completedAt,
}: {
  jobId: string
  /** Null when a unit is still unresolved, so no total exists — the job cannot be
   *  completed and the button is not offered. */
  balanceCents: number | null
  /** ISO string, or null while the job is not finished. */
  completedAt: string | null
}) {
  if (completedAt !== null) {
    return (
      <p className="u-mono text-xs text-navy/60">Completed on {new Date(completedAt).toLocaleDateString()}</p>
    )
  }

  if (balanceCents === null) return null

  return (
    <form
      action={completeJob}
      onSubmit={(e) => {
        if (!confirm(confirmMessage(balanceCents))) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={jobId} />
      <AdminSubmitButton
        label="Complete order"
        pendingLabel="Completing"
        className="rounded-full border border-navy bg-navy px-4 py-2 font-display text-sm text-paper transition duration-200 hover:bg-navy/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/jobs/[id]/CompleteOrderButton.test.tsx"`
Expected: PASS, all five.

- [ ] **Step 5: Wire it into the job detail page**

In `src/app/admin/(protected)/jobs/[id]/page.tsx`:

Add to the imports:

```ts
import { getJobBalance, loadJob } from '@/lib/jobs/queries'
import { CompleteOrderButton } from './CompleteOrderButton'
```

(replacing the existing `import { loadJob } from '@/lib/jobs/queries'`).

Add `getJobBalance(id)` to the existing `Promise.all`, so it costs no extra round trip:

```ts
  const [terms, warranty, documents, balance] = await Promise.all([
    listClauses('terms'),
    listClauses('warranty'),
    listDocuments(id),
    getJobBalance(id),
  ])
```

Then render it beside `StageButtons`, inside the same button row:

```tsx
          <StageButtons jobId={id} stage={loaded.job.stage} resolved={resolved} hasOrderDocument={hasOrderDocument} />
          {loaded.job.stage === 'order' && loaded.job.status !== 'cancelled' && (
            <CompleteOrderButton
              jobId={id}
              balanceCents={balance?.position?.balanceCents ?? null}
              completedAt={loaded.job.status === 'finished' && loaded.job.completedAt ? loaded.job.completedAt.toISOString() : null}
            />
          )}
```

The `status === 'finished'` check gates the completed-on line, not `completedAt` alone: reverting the status via the dropdown leaves `completedAt` stamped, and the screen must then offer the button again rather than claim the job is still complete.

- [ ] **Step 6: Full suite and lint**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all clean. Then stop for review — do not commit.

- [ ] **Step 7: Verify live (controller/user, not the implementer)**

Per the global constraints, UI flows are checked against the running app. On `/admin/jobs/<an order with a balance>`: the Complete order button shows a pending state on click, the confirm names the outstanding amount, and after completing, the screen shows "Completed on …" and the Status field reads Finished.

---

### Task 6: Generating, downloading and emailing the certificate

**Files:**
- Modify: `src/app/admin/(protected)/jobs/[id]/documents/actions.ts`
- Create: `src/app/admin/(protected)/jobs/[id]/documents/actions.test.ts`
- Create: `src/app/admin/(protected)/jobs/[id]/documents/GenerateCompletionPdfButton.tsx`
- Modify: `src/app/admin/(protected)/jobs/[id]/documents/page.tsx`
- Modify: `src/app/admin/(protected)/jobs/[id]/documents/DocumentRow.tsx`

**Interfaces:**
- Consumes: `buildCompletionSnapshot` (Task 2), `renderCompletionPdf` (Task 3), `jobs.completedAt` (Task 1), `completeJob`'s `status = 'finished'` (Task 4); plus `getJobBalance`, `loadJob`, `formatWarrantyNumber`, `put`, `db`.
- Produces: `generateCompletionDocument(_prevState, formData): Promise<ActionState>`.

**Two label maps, both needing an entry.** `DOCUMENT_LABELS` in `documents/actions.ts` feeds the email subject and body; `KIND_LABELS` in `DocumentRow.tsx` feeds the on-screen row. They are separate maps in separate files by design (server vs client); missing either leaves a half-labelled document.

- [ ] **Step 1: Write the failing tests**

Create `src/app/admin/(protected)/jobs/[id]/documents/actions.test.ts`, following the mocking pattern of `../payments/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn().mockResolvedValue({ url: 'https://blob.example/completion.pdf' }) }))
vi.mock('@/pdf/CompletionDocument', () => ({ renderCompletionPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('@/pdf/OrderDocument', () => ({ renderOrderPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('@/pdf/QuotationDocument', () => ({ renderQuotationPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('@/lib/jobs/mail', () => ({ sendDocumentEmail: vi.fn().mockResolvedValue({}) }))

const buildCompletionSnapshot = vi.fn().mockReturnValue({ number: 'WC00001' })
vi.mock('@/lib/jobs/snapshot', () => ({
  buildCompletionSnapshot,
  buildOrderSnapshot: vi.fn(),
  buildQuotationSnapshot: vi.fn(),
}))

const loadJob = vi.fn()
const getJobBalance = vi.fn()
vi.mock('@/lib/jobs/queries', () => ({ loadJob, getJobBalance }))

const insertValues = vi.fn().mockResolvedValue(undefined)
const dbExecute = vi.fn()
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    execute: (...args: unknown[]) => dbExecute(...args),
  },
}))

function finishedJob(overrides: Record<string, unknown> = {}) {
  return {
    job: {
      id: 'job-1',
      ref: 'RC00188',
      stage: 'order',
      status: 'finished',
      quotationDate: '2026-03-21',
      confirmedAt: new Date('2026-04-02T00:00:00Z'),
      completedAt: new Date('2026-09-22T00:00:00Z'),
      salesPerson: 'ISHAN',
      discountLabel: 'Cash Discount',
      discountCents: 0,
      freeDelivery: false,
      deliveryChargeCents: null,
      ...overrides,
    },
    customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: null, city: null, district: null },
    units: [],
    terms: [],
    warranty: [],
  }
}

const RESOLVED_BALANCE = {
  totals: { subtotalCents: 300_000_00, discountCents: 0, totalCents: 300_000_00 },
  payments: [],
  position: { paidCents: 0, balanceCents: 300_000_00 },
}

beforeEach(() => {
  vi.clearAllMocks()
  dbExecute.mockResolvedValue({ rows: [{ value: 1 }] })
})

describe('generateCompletionDocument', () => {
  it('generates a certificate for a finished order', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.success).toBe(true)
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect(insertValues.mock.calls[0][0]).toMatchObject({ kind: 'completion', number: 'WC00001', jobId: 'job-1' })
  })

  it('numbers the certificate from the WC series rather than reusing the job ref', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await generateCompletionDocument({}, formData)

    // Asserted through the number handed to the snapshot builder, not by
    // stringifying the drizzle `sql` template — an SQL object's toString is an
    // implementation detail and makes for a test that breaks on an ORM upgrade.
    expect(dbExecute).toHaveBeenCalledTimes(1)
    expect(buildCompletionSnapshot.mock.calls[0][0].number).toBe('WC00001')
    expect(insertValues.mock.calls[0][0].number).not.toBe('RC00188')
  })

  it('refuses a job that has not been completed yet', async () => {
    loadJob.mockResolvedValue(finishedJob({ status: 'in_progress' }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses a job that is not an order', async () => {
    loadJob.mockResolvedValue(finishedJob({ stage: 'quotation' }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses when a unit is still unresolved, so no total exists', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue({ totals: null, payments: [], position: null })
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('reports a missing counter row as a seedable problem rather than failing obscurely', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    dbExecute.mockResolvedValue({ rows: [] })
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toContain('db:seed')
    expect(insertValues).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/admin/(protected)/jobs/[id]/documents/actions.test.ts"`
Expected: FAIL — `generateCompletionDocument` is not exported.

- [ ] **Step 3: Write the generator**

In `src/app/admin/(protected)/jobs/[id]/documents/actions.ts`, extend the imports:

```ts
import { sql } from 'drizzle-orm'   // add alongside the existing desc, eq
import { buildCompletionSnapshot, buildOrderSnapshot, buildQuotationSnapshot } from '@/lib/jobs/snapshot'
import { formatWarrantyNumber } from '@/lib/jobs/reference'
import { renderCompletionPdf } from '@/pdf/CompletionDocument'
```

Append after `generateOrderDocument`:

```ts
/** The job's closing document. Refuses unless the job is actually finished — checked
 *  here and not merely hidden in the UI, per this area's rule that a generator never
 *  trusts its caller.
 *
 *  Unlike the order document, this allocates a number of its own from the WC series
 *  Slice 1 reserved for it: a warranty instrument is quoted by its own number years
 *  later, against a job reference the customer no longer remembers. Regenerating
 *  allocates a fresh number, the same way regenerating a receipt does — documents are
 *  immutable, so a reissue is a new document, never an edit. */
export async function generateCompletionDocument(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  if (!jobId) return { error: 'Missing job id.' }

  const loaded = await loadJob(jobId)
  if (!loaded) return { error: 'Quotation not found.' }
  if (loaded.job.stage !== 'order') return { error: 'Confirm this quotation as an order first.' }
  if (loaded.job.status !== 'finished') return { error: 'Complete this order before issuing the completion certificate.' }

  const balance = await getJobBalance(jobId)
  if (!balance || !balance.totals) {
    return { error: 'Every unit needs a chosen option before a completion certificate can be generated.' }
  }

  const counterRows = await db.execute<{ value: number }>(
    sql`update counters set value = value + 1 where key = 'warranty_card' returning value`,
  )
  const seq = Number(counterRows.rows[0]?.value)
  if (!Number.isInteger(seq)) {
    return { error: "Counter 'warranty_card' is missing — run npm run db:seed." }
  }

  const snapshot = buildCompletionSnapshot({
    number: formatWarrantyNumber(seq),
    ref: loaded.job.ref,
    quotationDate: loaded.job.quotationDate,
    confirmedDate: loaded.job.confirmedAt ? loaded.job.confirmedAt.toISOString().slice(0, 10) : loaded.job.quotationDate,
    completedDate: loaded.job.completedAt
      ? loaded.job.completedAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
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
    payments: balance.payments.map((p) => ({
      amountCents: p.amountCents,
      paidAt: p.paidAt,
      kind: p.kind as 'advance' | 'final' | 'other',
      method: p.method,
      note: p.note,
      createdAt: p.createdAt,
    })),
    terms: loaded.terms.map((c) => ({ body: c.body, emphasis: c.emphasis })),
    warranty: loaded.warranty.map((c) => ({ body: c.body, emphasis: c.emphasis })),
  })

  const pdf = await renderCompletionPdf(snapshot)
  const blob = await put(`completions/${snapshot.number}-${Date.now()}.pdf`, pdf, { access: 'public' })

  await db.insert(jobDocuments).values({
    id: randomUUID(),
    jobId,
    kind: 'completion',
    number: snapshot.number,
    blobUrl: blob.url,
    snapshot,
  })

  revalidatePath(`/admin/jobs/${jobId}/documents`)
  return { success: true }
}
```

- [ ] **Step 4: Add the server-side label**

In the same file, add one entry to `DOCUMENT_LABELS` so `emailDocument`'s subject and body read correctly:

```ts
const DOCUMENT_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order confirmation',
  receipt: 'Receipt',
  completion: 'Completion certificate',
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "src/app/admin/(protected)/jobs/[id]/documents/actions.test.ts"`
Expected: PASS, all six.

- [ ] **Step 6: Add the client-side label**

In `src/app/admin/(protected)/jobs/[id]/documents/DocumentRow.tsx`, add `completion` to `KIND_LABELS` and drop the now-unused `warranty_card` entry, which this document replaces:

```ts
const KIND_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order',
  receipt: 'Receipt',
  completion: 'Completion certificate',
  advance_invoice: 'Advance invoice',
  final_invoice: 'Final invoice',
}
```

- [ ] **Step 7: Write the generate button**

Create `src/app/admin/(protected)/jobs/[id]/documents/GenerateCompletionPdfButton.tsx`, mirroring `GenerateOrderPdfButton` exactly:

```tsx
'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { generateCompletionDocument, type ActionState } from './actions'

const initialState: ActionState = {}

export function GenerateCompletionPdfButton({ jobId }: { jobId: string }) {
  const [state, formAction] = useActionState(generateCompletionDocument, initialState)

  useEffect(() => {
    if (state.success) toast.success('Completion certificate generated.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <AdminSubmitButton
        label="Generate completion certificate"
        pendingLabel="Generating"
        className="rounded-full border border-navy bg-navy px-4 py-2 font-display text-sm text-paper transition duration-200 hover:bg-navy/80 active:scale-95 disabled:opacity-60"
      />
    </form>
  )
}
```

- [ ] **Step 8: Wire it into the documents page**

In `src/app/admin/(protected)/jobs/[id]/documents/page.tsx`, add the import:

```ts
import { GenerateCompletionPdfButton } from './GenerateCompletionPdfButton'
```

and extend the button row:

```tsx
      <div className="flex flex-wrap gap-3">
        <GeneratePdfButton jobId={id} />
        {loaded.job.stage === 'order' && <GenerateOrderPdfButton jobId={id} />}
        {loaded.job.stage === 'order' && loaded.job.status === 'finished' && <GenerateCompletionPdfButton jobId={id} />}
      </div>
```

- [ ] **Step 9: Full suite and lint**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all clean. Then stop for review — do not commit.

- [ ] **Step 10: Verify live (controller/user, not the implementer)**

On `/admin/jobs/<a completed order>/documents`: the Generate completion certificate button appears only once the job is finished; generating produces a `WC…` row; Download opens a PDF showing items, the payment ledger oldest-first, the warranty and the terms; Send by email delivers it to a customer with an email on file. Confirm the button is absent on an order that is not yet finished.

---

## Notes for the executor

**Task order matters.** Task 4 needs Task 1's column; Task 3 needs Task 2's type; Task 6 needs 2, 3 and 4. Tasks 2 and 3 are the only pair that could be reordered, and there is no reason to.

**Two things this plan deliberately does not do:**

- It does not add a "reopen" action. The Status dropdown on the edit screen already moves `finished` back, exactly as it already undoes Cancel.
- It does not block completion on an unpaid balance, anywhere, at any layer. If a reviewer flags the missing guard as a defect, that is a misreading of the spec: the warning is the whole feature, and a hard block would be worked around by editing the Status dropdown directly — which is the silent path this work exists to replace.
