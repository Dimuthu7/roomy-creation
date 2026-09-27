# Admin order completion

**Date:** 2026-09-22
**Status:** approved design, not yet implemented
**Supersedes (in part):** the warranty-card half of the Slice 4 row of
`docs/superpowers/specs/2026-09-08-admin-quotations-orders-design.md`

## Problem

Slice 2 shipped the commercial middle of a job: payments land, the job is
confirmed as an order, and the customer receives an order document and a
receipt per payment. What it left unbuilt is the *end* of the job.

Today an admin finishing an installation has two unrelated things to do, and
the system helps with neither. First, mark the job done — which currently
means opening the edit screen, finding the Status dropdown among a dozen other
fields, and choosing "Finished", with nothing checking that the customer has
actually paid. Second, hand over the closing paperwork: what was installed,
what was paid, what is covered by warranty, and under what terms. That last
document does not exist at all, so it is still produced by hand.

The result is a job whose commercial state can silently disagree with its
money — a "finished" job carrying an unpaid balance nobody was warned about —
and a warranty promise that lives only on the quotation the customer received
months earlier.

## Relationship to the original spec

The original spec's four-slice table put the **warranty card** in Slice 4,
alongside advance and final invoices, and put the **customer portal** in
Slice 3. This document takes the warranty card out of that sequence and ships
it early, ahead of Slice 3, because the business need is immediate: jobs are
completing now, and the closing handover is the one step still done on paper.

It also reshapes it. Rather than a standalone warranty card, the warranty
becomes one section of a single **completion certificate** that also carries
the delivered items, the full payment record, and the terms and conditions —
the whole handover in one document instead of three. Advance and final
invoices are untouched and remain Slice 4's work.

Everything else in the original spec — the one-job-one-row decision, immutable
document snapshots, the `stage`/`status` split, module boundaries — is
unchanged and still authoritative.

## Decisions

Four questions shaped this design.

1. **What does "complete" mean in the data model?** Setting the existing
   `status` to `'finished'` and stamping a new `completed_at`. Not a third
   `stage` value. `status` already carries exactly this meaning; adding
   `stage = 'completed'` would duplicate it, force every existing
   `stage === 'order'` check to be revisited, and create two fields that must
   never disagree.

2. **One closing document or several?** One. A single completion certificate
   carrying items, payments, warranty and terms. The customer gets one piece
   of paper at handover, and there is one snapshot builder and one PDF to
   maintain rather than three.

3. **When is it generated?** By an explicit button on the Documents page,
   after completion — not automatically inside the completion action. A PDF
   render and a blob upload can fail; a status transition should not be able
   to half-happen because of it. It also makes regeneration after a late
   payment an ordinary action rather than a special case.

4. **Does an outstanding balance block completion?** No. It warns, naming the
   amount, and the admin decides. Roomy Creations genuinely does complete
   installations with a balance still owed; a system that refuses would be
   worked around by editing the Status dropdown directly, which is exactly the
   silent path this spec exists to replace.

A fifth question was settled by precedent rather than discussion: **what
number does the certificate carry?** Its own `WC` series, not the job's `RC`
reference — see "Numbering" below.

## Data model

One new column on `jobs`, one new `job_documents.kind` value. No new table, no
new counter row, no existing column changes meaning.

```
jobs.completed_at    timestamp, nullable  -- when Complete order was pressed
```

Nullable and stamped only by the completion action, exactly mirroring
`jobs.confirmed_at` from Slice 2. No backfill: a job completed before this
column existed simply has no completion date, and cannot have a certificate
either, since it has no certificate to date.

`job_documents.kind` gains the value `'completion'`. `kind` is free text, so
this is a comment change, not a migration. That comment is currently
`'quotation' | 'order' | 'receipt' | 'advance_invoice' | 'final_invoice' |
'warranty_card'`; `'warranty_card'` is replaced by `'completion'`, since this
spec's certificate is what that reserved value was for.

**No counter change.** `scripts/seed.ts` already seeds a `warranty_card`
counter row at zero, and `formatWarrantyNumber()` already exists in
`src/lib/jobs/reference.ts`. Both were written in Slice 1 for exactly this
document and are used as-is.

Housekeeping, while touching the file: the `jobs.status` comment in
`src/db/schema.ts` reads `'pending' | 'in_progress' | 'finished'` and is
missing `'cancelled'`, which `JOB_STATUSES` has carried since Slice 1. Correct
it in the same change.

### Migration

`npm run db:generate` produces migration `0005` adding `jobs.completed_at`.
Additive and nullable, so it applies to a live database with no downtime and
no data movement.

## Numbering

The certificate carries a `WC00001`-style number from the shared `counters`
table, allocated with the same single-statement pattern `allocateRef` and the
receipt generator already use:

```sql
update counters set value = value + 1 where key = 'warranty_card' returning value
```

A missing counter row is reported as `"Counter 'warranty_card' is missing —
run npm run db:seed."`, matching the receipt generator's existing message
rather than failing obscurely.

This deliberately breaks from the order document, which reuses the job's `RC`
ref. The reasoning differs because the documents differ: the order document is
the job, so it carries the job's number, and there is one per job for its
whole life. The certificate is a **warranty instrument** the customer may
quote years later, against a job reference they no longer remember, and Slice
1 already reserved a `WC` series for precisely that. The job's `RC` ref still
prints on the certificate as a cross-reference, so nothing is lost.

Regenerating allocates a **new** `WC` number, the same way regenerating a
receipt does. Documents are immutable; a reissued certificate is a new
document, not an edit of the old one.

## Completing an order

A new server action `completeJob` in
`src/app/admin/(protected)/jobs/actions.ts`, sibling to `setJobStage` and
following its shape exactly: a plain `(formData) => Promise<void>` form action,
since a single state flip needs no per-field error feedback.

It refuses, server-side and silently, unless all of:

- the job exists
- `stage === 'order'` — a quotation has nothing to complete
- `status !== 'cancelled'` — a cancelled job is not completed, it is abandoned
- the job's totals resolve (`jobTotals(...) !== null`), i.e. every unit has a
  chosen option

The last is the same invariant `setJobStage` enforces when confirming, checked
again here rather than assumed, per Slice 2's rule that an action never trusts
that its caller already checked.

On success it sets `status: 'finished'` and `completed_at: now`.

It deliberately does **not** touch `jobs.updated_at`. That column drives the
"stale" marker on the Documents page (`doc.createdAt < job.updatedAt`), and
completing a job is a state transition, not a content edit — bumping it would
falsely mark every previously issued document as out of date. This is the same
bug fixed in `setJobStage` during Slice 2's final review, and the same reason.

**Completion never touches `stage`.** A completed job is still an order.
`stage` and `status` remain the two orthogonal axes the original spec
established.

**Completion is reversible at no cost.** The Status dropdown on the edit
screen already moves `finished` back to `in_progress`, exactly as it already
undoes Cancel. No separate "reopen" action is built. `completed_at` keeps its
value through a reversal and is re-stamped if the job is completed again, so
the date always reflects the current completion rather than the first one.

## The pending-payment warning

A new client component `CompleteOrderButton`, rendered beside `StageButtons`
on the job detail screen, and following `CancelQuotationButton`'s pattern: a
`confirm()` in `onSubmit` is the only reason it is a client component.

It uses `AdminSubmitButton` (label `Complete order`, pendingLabel
`Completing`), so the click shows a pending state — the same treatment Confirm
order received.

The job detail page already loads the job and its documents; it adds one
`getJobBalance(id)` call to pass `balanceCents` in. The confirm text varies:

| Balance | Message |
|---------|---------|
| `> 0` | `There is a pending payment of LKR 125,000.00 on this order. Complete it anyway?` |
| `= 0` | `Complete this order? You can then issue the completion certificate.` |
| `< 0` | `This order is overpaid by LKR 5,000.00. Complete it anyway?` |
| `null` | button is not rendered — an unresolved job cannot be completed |

Amounts are formatted with `formatCents` from `src/lib/money.ts`, the same
formatter every other money string in the admin uses.

The overpaid case is called out rather than folded into "paid in full" for the
same reason `paymentPosition` refuses to clamp its balance at zero: an
overpayment is a real bookkeeping problem, and the moment of completion is the
last good chance to notice it.

**The balance is never a gate.** It shapes the message and nothing else;
`completeJob` does not read it. A client that skipped the dialog entirely
still completes the job, which is correct — the warning is an aid to the
admin, not an invariant.

When the job is already finished, the button is replaced by a plain
`Completed on 22 Sep 2026` line, so the screen states the fact rather than
offering an action that would do nothing.

## The completion certificate

### Content

Six sections, in order:

1. **Header** — "Completion Certificate", the `WC` number, the completion
   date, the order's confirmation date, and the job's `RC` ref as a
   cross-reference. Both dates appear because the pair states the job's
   duration, which is the question a warranty claim asks first.
2. **Customer** — name, address, phone, reusing the existing header block.
3. **Items delivered** — each unit with its chosen option and price, the same
   table the order document prints. This makes the certificate self-contained:
   a warranty claim two years later shows exactly which items are covered,
   without needing the order document alongside it.
4. **Payment details** — one row per payment (date, kind, method, amount),
   **oldest first by `paid_at`**, then order total, total paid, and balance.
   Chronological order is what a statement reads like; the Payments screen's
   newest-first ordering is a working view, not a handover document. Payment
   kinds are labelled with the same wording the receipt already uses, so
   "advance payment" means the same thing on both documents.
5. **Warranty** — the job's own warranty clauses.
6. **Terms and conditions** — the job's own terms clauses.

Sections 5 and 6 come from `job_clauses`, which already holds a per-job copy
of both kinds. The certificate prints the job's clauses, never the current
library's — the same copy-not-reference rule that keeps RC188 and RC194 able
to carry different wording for the same clause.

A non-zero balance prints plainly, as its own row, rather than being
suppressed. A certificate that hides an unpaid balance is worse than one that
states it.

### Snapshot

`buildCompletionSnapshot()` in `src/lib/jobs/snapshot.ts`, wrapping
`buildQuotationSnapshot` the way `buildOrderSnapshot` already does, so the
items table, clause blocks and customer header render from shapes the existing
PDFs already handle:

```ts
export interface CompletionSnapshotPayment {
  paidAtLabel: string
  kindLabel: string
  method: string | null
  amountLabel: string
}

export interface CompletionSnapshot extends QuotationSnapshot {
  number: string           // WC00001
  completedDate: string
  confirmedDate: string
  payments: CompletionSnapshotPayment[]
  paymentPosition: SnapshotPaymentPosition | null
}

export interface CompletionSnapshotInput extends SnapshotInput {
  number: string
  completedDate: string
  confirmedDate: string
  payments: Payment[]
}
```

Money and dates are stored as pre-formatted labels, following every existing
snapshot in the file: a snapshot is what the document *said*, so it holds
display strings, not values to be re-formatted years later under whatever
locale rules then apply.

`paymentPosition` reuses the existing `SnapshotPaymentPosition`
(`paidLabel`, `balanceLabel`) and the existing `paymentPosition()` function,
which returns null when the job is unresolved.

### PDF

`src/pdf/CompletionDocument.tsx` exporting `renderCompletionPdf`, composed
from the shared `blocks.tsx` and `styles.ts` the other three documents already
use. No refactor of the shared blocks is anticipated; if the payment-details
table turns out to want one, it follows Slice 2's precedent of extracting into
`blocks.tsx` and re-running the existing PDF tests unmodified as the
refactor's correctness guard.

### Generation, download and email

`generateCompletionDocument` in
`src/app/admin/(protected)/jobs/[id]/documents/actions.ts`, mirroring
`generateOrderDocument`. It refuses unless the job exists, `stage === 'order'`,
`status === 'finished'`, and the balance query returns resolved totals. It
stores the PDF at `completions/<WC number>-<timestamp>.pdf` via the existing
`@vercel/blob` `put`, and inserts an immutable `job_documents` row with
`kind: 'completion'` and `number:` the `WC` number.

A `GenerateCompletionPdfButton` appears on the Documents page, visible only
once the job is finished, following `GenerateOrderPdfButton`'s existing shape.

Download and email need no new code. Adding
`completion: 'Completion certificate'` to the `DOCUMENT_LABELS` map in the
same file makes the existing Download and *Email to customer* buttons work on
the new document unchanged — `emailDocument` already sends whatever PDF is
stored at a document's `blobUrl`, to whatever email the customer has on file,
and records `sentTo`/`sentAt`.

## Admin routes

No new routes. The work lands on two existing screens:

- `/admin/jobs/[id]` — the Complete order button, or the completed-on line.
- `/admin/jobs/[id]/documents` — the Generate completion certificate button,
  and the resulting document row with its existing Download and Email actions.

## Invariants

- **A job can only be completed from `stage = 'order'`**, with every unit
  resolved. Enforced server-side in `completeJob`, not merely hidden in the UI.
- **An outstanding balance never blocks completion.** It warns only.
- **Completion never changes `stage`**, and never touches `jobs.updated_at`.
- **A certificate can only be generated for a job that is actually finished.**
  Re-checked in `generateCompletionDocument`, independently of the button's
  visibility.
- **Documents stay immutable.** Regenerating a certificate inserts a new row
  with a new `WC` number; it never updates the previous one. A certificate
  issued before a status reversal continues to describe a completion that, at
  the time, had happened.
- **Clauses are copied, never referenced.** The certificate prints the job's
  own terms and warranty rows.

## Testing

Following the Slice 1 and 2 pattern exactly:

- **`buildCompletionSnapshot`** unit tested directly: the payment ledger's
  ordering and labels, the zero / non-zero / negative balance cases, and the
  unresolved-job → `null` position case as an explicit test.
- **`CompletionDocument`** asserted at the document-tree level from fixture
  snapshots, as the three existing PDF tests do — including an assertion that
  a non-zero balance is present in the output rather than suppressed.
- **`completeJob`** tested for each refusal path (wrong stage, cancelled
  status, unresolved units, missing job) and for the success path setting
  `status` and `completed_at` while leaving `stage` and `updated_at` alone.
  The last is a regression guard for the staleness bug, not a redundant
  assertion.
- **`generateCompletionDocument`** tested for its refusal when the job is not
  finished, and for allocating from the `warranty_card` counter.
- **`CompleteOrderButton`** tested for the three confirm-message variants and
  for not rendering when the balance is null.
- **UI flows** (Complete order with and without a balance, generate the
  certificate, download it, email it) verified live against the running app,
  never inside vitest — per this project's standing rule for anything
  UI-touching.

## Environment

No new environment variables. `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`,
`RESEND_API_KEY` and `DOCS_FROM_EMAIL` are all reused — the certificate is
stored and sent through exactly the paths quotations, orders and receipts
already use.

## Constraints

Unchanged: Next.js 16.2.12 with its bundled docs in `node_modules/next/dist/docs/`
as the authority on API surface; single shared admin login, so `completed_at`
records when but never who; LKR only.

## Deferred by choice

- **Advance and final invoices** (Slice 4). This certificate is not an
  invoice: it records what was paid, it does not demand payment.
- **A standalone warranty card.** Folded into this document by decision 2. If
  one is ever wanted separately, the snapshot already carries everything it
  would need.
- **Blocking completion on an unpaid balance**, and any automatic chasing of
  one. Decision 4.
- **A "reopen" action.** The Status dropdown already does it.
- **Customer portal visibility of the certificate** (Slice 3 territory).
- **Warranty expiry dates and claim tracking.** The warranty clauses are
  prose, as they are on paper today; nothing in this design makes them
  machine-readable, and nothing needs to yet.
