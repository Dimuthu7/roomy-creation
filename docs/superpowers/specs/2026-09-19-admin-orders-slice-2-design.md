# Admin orders (Slice 2)

**Date:** 2026-09-19
**Status:** approved design, not yet implemented
**Supersedes (for Slice 2 only):** the Slice 2 row of
`docs/superpowers/specs/2026-09-08-admin-quotations-orders-design.md`

## Problem

Slice 1 shipped the whole quotation flow: units, options, spec lines, clause
attachment, option selection, and the quotation PDF. That PDF already prints
only the chosen option and a real total once every unit is resolved — which
means it already reads like a confirmed order the moment a customer decides.

What is still missing is the commercial event *after* that: money arrives, the
job is confirmed, and two more pieces of paper are owed to the customer — a
confirmation of what they've committed to, and a receipt each time they pay.

## Relationship to the original spec

The original spec's Slice 2 row read "Payments, stage advance, option
selection, T&C and warranty attachment, order PDF." Option selection and
clause attachment shipped in Slice 1 because the quotation PDF needed them
immediately (RC194's two-option unit had to render correctly). This document
covers what actually remains: **payments, a manual stage advance, the order
document, and a minimal receipt document.**

It also resolves two gaps the original spec left open:

- `documents.kind` was enumerated without an `order` value, despite promising
  an "order PDF." This spec adds `order` and `receipt`.
- The original spec reserved `/admin/jobs/[id]/order` for "selection, terms,
  warranty." All three already live on the Slice 1 edit screen. That route is
  dropped; a `/admin/jobs/[id]/payments` route takes its place.

Everything else in the original spec — the content model, the one-job-one-row
decision, immutable document snapshots, module boundaries — is unchanged and
still authoritative.

## Decisions

Four questions shaped this design, asked against how Roomy Creations actually
operates today:

1. **What does a customer receive when they pick an option and pay?** Both a
   confirmed order document and a payment receipt, at different moments — not
   the same document, and not verbal-only.
2. **What does the order document add beyond the quotation?** Advance paid,
   balance due, and a due-date treatment — the quotation alone doesn't state a
   committed price or payment position.
3. **How should advance/balance/due-date read?** As two amount rows (Advance
   Paid, Balance Due) plus a single editable terms sentence — not a full
   payment-schedule table, and not a rigid due-date field. Roomy Creations'
   real terms are phrases like "on completion of installation," which a date
   field can't hold without lying.
4. **What moves a job from quotation to order?** A manual **Confirm order**
   button — never automatic — but recording a payment against a
   quotation-stage job surfaces a prompt to confirm, so it's hard to forget
   without ever happening behind the admin's back.
5. **Do receipts ship in this slice?** Yes, kept deliberately minimal: a
   single acknowledgement line reusing the quotation's header/footer, not a
   full invoice layout (that's Slice 4's job).

## Data model

One new table, two new columns on `jobs`, one new column on `job_documents`,
two new `documents.kind` values, and one new counter row. No existing column
changes meaning.

```
payments             id, job_id → jobs (cascade)
                      kind          'advance' | 'final' | 'other'
                      amount_cents  bigint
                      paid_at       date
                      method        text, nullable
                      note          text, nullable
                      created_at
```

`method` is free text with a `<datalist>` of common values (cash, bank
transfer, cheque), matching how `jobs.sales_person` already works rather than
introducing another enum for something with no fixed vocabulary.

```
jobs.payment_terms   text, nullable   -- the editable sentence on the order doc
jobs.confirmed_at    timestamp, nullable -- when Confirm order was pressed
```

`payment_terms` is nullable so no backfill is required; rendering falls back
to a default constant (`'Balance payable on completion of installation.'`)
when null. `confirmed_at` is separate from `quotation_date` because the order
document needs its own date — reusing the quotation's date would misdate the
confirmation.

```
job_documents.payment_id   text → payments(id) ON DELETE SET NULL
```

Nullable and `SET NULL` rather than `CASCADE`: deleting a payment must never
delete the receipt document already issued for it. The document's snapshot is
self-contained and keeps meaning regardless of what happens to the payment
row afterward — the same immutability principle Slice 1 established for
every other document kind.

```
documents.kind   'quotation' | 'order' | 'receipt' | 'advance_invoice' | 'final_invoice' | 'warranty_card'
```

`order` and `receipt` are new. Both remaining values stay reserved for Slice
4. Since `kind` is `text` validated by Zod (per the original spec's rationale
for avoiding Postgres enums), this is an application-level change with no
migration risk beyond adding the columns and table above.

New counter row: `receipt = 0`. `job_ref` and `invoice`/`warranty_card`
counters are untouched — the order document reuses the job's own `ref`
(`RC00195`), never allocating a new number, so the customer keeps knowing
their job by the one number they were given at quotation time. Receipts get
their own series: `formatReceiptNumber()` → `RCP00001`, added to
`src/lib/jobs/reference.ts` alongside the existing (currently unused)
`formatInvoiceNumber` and `formatWarrantyNumber`.

### Migration

`payments` cascades from `jobs` like every other child table. The partial
unique index pattern from `unit_options` does not apply here — there is no
"at most one payment" invariant. `drizzle-kit generate` should produce a
straightforward migration; unlike the Slice 1 `unit_options_one_selected`
index, there is no partial-predicate step to check by hand.

## Pure logic — `src/lib/jobs/payments.ts`

```ts
export function paidTotalCents(payments: { amountCents: number }[]): number

export function paymentPosition(
  totalCents: number | null,
  payments: { amountCents: number }[],
): { paidCents: number; balanceCents: number } | null
```

`paymentPosition` returns `null` whenever `totalCents` is `null` — i.e.,
whenever `jobTotals()` (Slice 1) returned `null` because some unit is still
unresolved. A balance can never be computed or printed against a price that
isn't settled yet. This mirrors the totals rule's own null-propagation
exactly, so the two compose without new special-casing: `resolvedOption` →
`jobTotals` → `paymentPosition`, each stage refusing to produce a number until
its input is complete.

Both functions are pure, take plain arrays, and do no I/O — unit-tested
directly like `totals.ts`.

## The order document

Same page layout as the quotation — company header, client/meta block, the
unit table, delivery row — retitled `ORDER` and dated from `confirmed_at`
rather than `quotation_date`. Because `buildQuotationSnapshot` already prints
only the `resolvedOption` per unit and only emits a totals block once every
unit resolves (the Slice 1 totals rule), the body of this document requires
no new rendering logic. Generating an order document for a job with any
unresolved unit is refused by the action before it ever reaches the PDF layer
— see Invariants below.

What's added is two rows under the existing totals block, plus a terms
sentence:

```
        Sub Total        368,500.00
        Cash Discount     18,500.00
        TOTAL            350,000.00
        Advance Paid     150,000.00
        Balance Due      200,000.00

  Balance payable on completion of installation.
```

`buildOrderSnapshot()` (new, `src/lib/jobs/snapshot.ts`) wraps
`buildQuotationSnapshot()`'s output and adds:

```ts
export interface SnapshotPaymentPosition {
  paidLabel: string
  balanceLabel: string
}

export interface OrderSnapshot extends QuotationSnapshot {
  confirmedDate: string
  paymentPosition: SnapshotPaymentPosition
  paymentTerms: string
}
```

Like every other document, the payment figures are frozen into the snapshot
at generation time. If more money arrives after the order document is issued,
that document does not change — a new one is generated and both remain in the
documents history, exactly as re-generating a quotation already works.

The order document keeps the job's `ref` (`RC00195`), not a new number. The
documents list distinguishes issued documents by `kind` and date, not by
number.

## The receipt document

Deliberately minimal, reusing the header, footer and signature block from the
existing document components. Body is a single acknowledgement, not a line
-item invoice:

```
              RECEIPT                          RCP00001

  Received with thanks from  Mr. W. Williams
  the sum of                 150,000.00
  being                      advance payment for RC00195
  received on                12 Sep 2026  by bank transfer

  Balance remaining          200,000.00
```

"Balance remaining" uses the same `paymentPosition()` computed as of the
receipt's generation time (i.e., including the payment the receipt is for),
frozen into its snapshot like everything else. Generated per payment, from
the payments screen, immediately after a payment is recorded or later on
demand.

```ts
export interface ReceiptSnapshot {
  number: string
  ref: string
  customerName: string
  amountLabel: string
  kindLabel: string       // "advance payment" | "final payment" | payments.note verbatim for 'other'
  paidAtLabel: string
  method: string | null
  balanceRemainingLabel: string | null   // null if the job has no total yet
}
```

## PDF composition — the one refactor

`QuotationDocument.tsx` currently holds seven module-local functions
(`companyHeader`, `clientAndMeta`, `tableHeader`, `unitRows`, `deliveryRow`,
`totalsBlock`, `clauseList`, `signatureBlock`). This slice adds two more
document types that need most of the same pieces, and Slice 4 adds three
more after that — so the extraction pays for itself now rather than being
speculative.

Those functions move, unchanged, into a new `src/pdf/blocks.tsx` as exported
components. `QuotationDocument.tsx`, `OrderDocument.tsx`, and
`ReceiptDocument.tsx` become thin compositions of the shared blocks plus
whatever is unique to each (the two extra totals rows and terms line for
`OrderDocument`; the acknowledgement body for `ReceiptDocument`).

The risk is changing the quotation's rendered output by accident during the
move. The existing `QuotationDocument.test.tsx` tree-assertions are the
guard: they must pass **unchanged, with no edits to the test file itself**,
both before the refactor (as today) and after. If a change to
`QuotationDocument.test.tsx` turns out to be necessary to keep it green, that
is a signal the refactor altered behavior and needs to be reworked, not that
the test needs updating.

## Admin routes

```
/admin/jobs/[id]/payments     new — balance summary, add-payment form,
                               payment list with per-row "Generate receipt"
                               and delete
```

This replaces the original spec's reserved `/admin/jobs/[id]/order` route,
which has no remaining purpose now that selection, terms and warranty all
live on the Slice 1 edit screen.

The job header (`src/app/admin/(protected)/jobs/[id]/page.tsx`) gains:

- A **Confirm order** button, shown only when `stage === 'quotation'` and
  every unit resolves (see Invariants) — placed alongside the existing
  **Cancel quotation** button.
- A **Payments** link, alongside the existing **Documents** link.

The edit screen (`JobEditor.tsx`) gains a `payment_terms` field under
Quotation details.

The documents screen (`documents/page.tsx`) gains **Generate order
document**, enabled only at `stage === 'order'`, alongside the existing
**Generate quotation document**.

Recording a payment on a `stage === 'quotation'` job surfaces a confirmation
prompt ("This job now has a payment recorded — confirm it as an order?")
rather than silently changing stage. Declining leaves the payment recorded
and the job at `stage === 'quotation'` — payments and stage remain
independently true at all times, per the invariant below.

## Invariants

- **A job cannot be confirmed as an order while any unit is unresolved.** An
  order with an open choice has no total and no meaning — `setJobStage` (new
  action) checks `jobTotals(units) !== null` server-side before flipping
  `stage`, and the Confirm order button is disabled client-side with the
  reason shown, matching how validation already works elsewhere in this
  codebase (e.g. the existing save-validation pattern in `actions.ts`).
- **Recording a payment never changes `stage` by itself.** It only ever
  prompts. This is a deliberate reversal of the original spec's "automatic on
  advance" model, chosen because a mistyped payment must never silently
  change a job's commercial state.
- **Payments never touch `status`.** Money (`stage`) and production
  (`status`) remain the two orthogonal axes the original spec established;
  this slice does not blur that line.
- **Reverting `stage` from `order` back to `quotation` stays available**, for
  mis-clicks — with a warning if an order document has already been issued,
  since that document's snapshot will then describe a stage the job is no
  longer in. The document itself is not affected (immutability), but the
  warning exists so the admin isn't surprised later.

## Testing

Following the Slice 1 pattern exactly:

- **Pure logic** — `paidTotalCents`, `paymentPosition` — unit tested directly,
  including the "unresolved job → null balance" case as an explicit test, the
  same way Slice 1 tested `totals.ts`'s "RC194 → null" case.
- **Zod schemas** for the payment form and `payment_terms` field, tested for
  accept and reject.
- **Server actions** (`recordPayment`, `deletePayment`, `setJobStage`,
  `generateOrderDocument`, `generateReceipt`) tested for validation and
  authorization paths, and specifically for the "unresolved unit blocks
  confirm" and "payment never changes stage" invariants above.
- **`OrderDocument` and `ReceiptDocument`** asserted at the document-tree
  level from fixture snapshots, as `QuotationDocument.test.tsx` already does.
- **`QuotationDocument.test.tsx`** re-run unmodified after the `blocks.tsx`
  refactor, as the refactor's correctness guard.
- **UI flows** (Confirm order, record a payment, generate each new document)
  verified live against the running app, never inside vitest — per this
  project's standing rule for anything UI-touching.

## Environment

No new environment variables. `RESEND_API_KEY`, `DATABASE_URL`,
`BLOB_READ_WRITE_TOKEN` and `DOCS_FROM_EMAIL` (added in Slice 1) are reused —
order documents and receipts are sent through the same `src/lib/jobs/mail.ts`
path as quotations.

## Constraints

Unchanged from the original spec: Next.js 16.2.12 with its bundled docs as
the authority on API surface; single shared admin login (no per-payment audit
trail beyond `created_at`); LKR only.

## Deferred by choice

- Advance and final invoices, and the warranty card (Slice 4) — this slice's
  receipt is intentionally not that document.
- Payment schedules with more than one future instalment (e.g. three-part
  payment plans) — `payments` already models arbitrary rows per job, so
  adding this later needs no migration, only UI.
- Customer portal visibility into payments (Slice 3 territory, and not
  requested).
- Automatic reminders for a balance coming due — `payment_terms` is prose,
  not a machine-readable date, by deliberate choice (see Decisions above).
