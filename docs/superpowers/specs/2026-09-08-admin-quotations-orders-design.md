# Admin quotations, orders and documents

**Date:** 2026-09-08
**Status:** approved design, not yet implemented

## Problem

Roomy Creations runs its entire sales process on paper and hand-edited Word
documents. A customer asks about a wardrobe or a table; the manager writes a
quotation listing each unit with its full specification and price, sometimes
offering the customer a choice of finishes at different price points; the
customer picks; an advance is paid; the job goes into production; the balance
is paid on installation.

Nothing about that is recorded in a system. There is no list of open
quotations, no way to see which jobs are in production, no invoice, no warranty
card, and no way for a customer to check on their own job without phoning. Two
real documents — `RC188` (Williams, Galapitamulla) and `RC194` (Mallawapitiya)
— are the source material for this design and are referred to throughout.

The goal is to move the whole flow into the existing admin portal without
making it *slower* than Word. That last constraint drives more of this design
than any other: RC194's wardrobe unit carries twelve specification lines, and a
system that makes an admin retype those will be abandoned.

## Scope

Four slices, each independently shippable:

| Slice | Contents |
|-------|----------|
| 1 | Clause library, spec-line snippets, customers, jobs, units/options/spec lines, quotation PDF, email delivery |
| 2 | Payments, stage advance, option selection, T&C and warranty attachment, order PDF |
| 3 | Customer portal, 3D art upload |
| 4 | Advance invoice, final invoice, warranty card |

Slice 1 replaces the paper quotation process end to end and carries most of the
value. This spec covers all four, since the data model has to accommodate them
from the start, but the implementation plan sequences them.

## Core decision: a quotation and an order are one record

The obvious model is two tables — a `quotations` table, and an `orders` table
populated by copying a quotation when the advance is paid. This is rejected.

`RC00194` is the job's real-world identity. It is what the manager says on the
phone, what is written on the customer's copy, and what the customer has in
their inbox. It does not change when money arrives. A second table means a
second identifier for the same job, every unit and specification line
duplicated, two places to edit, and silent drift between them the first time
someone fixes a typo in only one.

Instead there is one `jobs` row per job, carrying two orthogonal fields:

```
jobs.stage    quotation ──advance recorded──► order
              (commercial: has the customer committed?)

jobs.status   pending ──► in_progress ──► finished
              (production: is it being built?)
```

The order screen is the quotation screen plus three panels — option selection,
terms, warranty. Nothing is copied.

The single thing the two-table model buys is a quotation that cannot change
after it is sent. That is obtained here a better way, via document snapshots
(see "Documents are immutable snapshots" below): the *record* keeps evolving,
the *sent document* never does.

## Content model

### Units, options and specification lines

The two source documents differ in exactly one structural way, and it decides
the whole model.

`RC188` lists four units, each with a single price:

```
Unite 01- Cupboards With Doors - W 2950mm x H 1980mm x D 485mm
  ❖ Carcase - Fabrication of cupboards carcase made out with 18mm …
  ❖ Doors - Fabrication of cupboards Doors made out with 18mm …
  … 4 more                                        235,000.00  01  235,000.00
```

`RC194` lists two units, and the second offers the customer a choice:

```
Study Cupboards
  ➢ Option 01
      ❖ Size– L- 2780mm X H-2370mm X D-400mm
      … 5 more                                    182,500.00  01  182,500.00
  ➢ Option 02
      ❖ Size– L- 2780mm X H-2370mm X D-400mm
      … 5 more                                    257,000.00  01  257,000.00
```

So a **unit** is a titled row group, and it carries **one or more priced
options**. The customer chooses one option per unit. `RC188`'s units are
single-option; `RC194`'s Study Cupboards is two-option.

**Specification lines belong to the option, not the unit.** This was checked
against the data rather than assumed. RC194's two options share their `Size`
and `Door Mechanism` lines and differ on carcase, side panels, doors and
handles — and the shared and differing lines are *interleaved*:

```
Size ............... identical
Cupboard Carcas .... differs
Side Panels ........ differs
Cupboard Doors ..... differs
Door Mechanism ..... identical
Handles ............ differs
```

A model with a shared unit-level list plus an option-level list would have to
choose a print order between the two lists, which would reorder the document.
Rejected. Each option carries its own complete, ordered list, and the
duplication is solved in the editor with a "Duplicate option" action rather
than in the schema.

They are not really bullets — each is a label and a value (`Carcase` →
`Fabrication of cupboards carcase made out with…`). The label is optional:
`01 Soft closing drawer with 01 cupboard` in RC188's Table 01 has none. So they
are modelled as **specification lines** with a nullable label.

Three invariants hold this together:

1. **Every unit has at least one option.** A fixed-price unit is a unit with a
   single unlabelled option. There is no nullable price on the unit and no
   second rendering path.
2. **At most one option per unit may be marked selected**, enforced by a
   partial unique index in Postgres rather than by application code.
3. **A single-option unit is implicitly selected.** This is derived by a pure
   function, never stored, so there is nothing to keep in sync.

### The totals rule

`RC188` prints a totals block; `RC194` prints none. This is not an oversight —
RC194 still has an open choice, so it cannot be totalled.

That behaviour falls out of the model with no special-casing:

```
resolvedOption(unit) = unit.options.length === 1
                         ? unit.options[0]
                         : unit.options.find(o => o.selected) ?? null

totals(job) = every unit resolves ? { subtotal, discount, delivery, total }
                                  : null      // omit the block
```

Once the customer picks and the admin records the selection, the block appears.

### Money

All amounts are integer **cents**, stored as `bigint` with Drizzle's
`{ mode: 'number' }` (LKR totals are far below 2^53). Never floats. A tested
`src/lib/money.ts` handles parsing admin input and formatting as `368,500.00`
— no currency symbol, matching the existing documents.

### Delivery

A `free_delivery` boolean plus a nullable `delivery_charge_cents`. The admin UI
is a "Free delivery" checkbox that reveals an amount field when unchecked.
Three behaviours result, and they cover both source documents:

| State | PDF row | Effect on total |
|-------|---------|-----------------|
| checked | `Delivery Charges & Installation Charges For All Items … Free` | none (RC194) |
| unchecked, amount entered | same label, amount in the total column | added |
| unchecked, blank | row omitted entirely | none (RC188) |

### Job reference numbers

`RC` followed by the sequence zero-padded to five digits: `RC00194`,
`RC00195`. The counter is seeded at 194, so the first job created by the system
is `RC00195`. Padding degrades gracefully past 99999 (the number simply grows).

Both the formatted `ref` and the raw `ref_seq` integer are stored — `ref` for
display and uniqueness, `ref_seq` for correct numeric ordering in lists, which
string ordering of `ref` would give anyway under this padding but which should
not depend on the padding staying fixed.

A quotation document's number **is** the job reference — regenerating a
quotation for `RC00195` produces another `RC00195` document, distinguished by
its creation time rather than by a new number, because the customer knows the
job by that one number.

Invoices and warranty cards get their own independent series from the same
counter mechanism, since they are separate documents a customer may hold
alongside the quotation: `INV00001` for both invoice kinds (one continuous
series, the kind distinguishing them) and `WC00001` for warranty cards.

## Schema

New tables, added to `src/db/schema.ts` alongside the existing `site_config`,
`works` and `testimonials`. All ids are `text` primary keys holding a
`randomUUID()`, matching the existing `testimonials` table.

```
customers            name, phone, email, address_lines[], city, district, notes

jobs                 ref, ref_seq, customer_id → customers
                     sales_person, quotation_date, estimation_date
                     stage, status
                     free_delivery, delivery_charge_cents
                     discount_label, discount_cents
                     advance_cents            (agreed advance, a quotation term)
                     portal_token, notes

job_units            job_id → jobs, position, title
unit_options         unit_id → job_units, position, label,
                     price_cents, qty, selected
option_specs         option_id → unit_options, position, label, value

job_clauses          job_id → jobs, kind, position, body, emphasis
job_media            job_id → jobs, kind, blob_url, caption, position
payments             job_id → jobs, kind, amount_cents, paid_at, method, note
documents            job_id → jobs, kind, number, blob_url, snapshot,
                     sent_to, sent_at

clause_library       kind, body, emphasis, position, active
spec_snippets        label, value, use_count
counters             key, value
```

Every child table cascades on delete from its parent, so removing a job removes
its units, options, spec lines, clauses and media in one statement.

### Enumerated values

Stored as `text` with application-level validation via Zod, matching the
existing `testimonials.source` convention rather than introducing Postgres
enums (which are painful to alter):

- `jobs.stage` — `quotation` | `order`
- `jobs.status` — `pending` | `in_progress` | `finished`
- `job_clauses.kind`, `clause_library.kind` — `terms` | `warranty`
- `job_media.kind` — `3d_art` | `photo`
- `payments.kind` — `advance` | `final` | `other`
- `documents.kind` — `quotation` | `advance_invoice` | `final_invoice` | `warranty_card`

### The selected-option index

```sql
CREATE UNIQUE INDEX unit_options_one_selected
  ON unit_options (unit_id) WHERE selected;
```

This is the structural guarantee behind invariant 2. Drizzle expresses it with
`uniqueIndex(...).on(t.unitId)` plus a `.where()` predicate. Because
`drizzle-kit generate` may not emit the partial predicate, the generated
migration must be checked and `WHERE selected` added by hand if missing.

### Reference numbering

```sql
UPDATE counters SET value = value + 1 WHERE key = 'job_ref' RETURNING value;
```

A single atomic statement, so two admins creating quotations at the same moment
cannot collide. Seeded rows: `job_ref = 194`, `invoice = 0`,
`warranty_card = 0`.

## Clause libraries

Terms and warranty clauses live in one `clause_library` table separated by
`kind`, since they behave identically — an ordered list of reusable paragraphs
with an `emphasis` flag (RC188 and RC194 both bold clause 6, `3 Years Warranty
for Product`) and an `active` flag so a retired clause stops being offered
without vanishing from past jobs.

**A job copies clause text rather than referencing it.** This is not
normalisation laziness — it is required by the data. The two source documents
carry *different wording for the same clause*:

```
RC188 ①  Manufacturing time - 15 to 30 days after the advance payment paid.
RC194 ①  Manufacturing time - 10 to 30 days after the advance payment paid.

RC188 ②  This quotation is valid only for the design provided.
RC194 ②  This quotation is valid only for the design provided. No any hidden
         charges base on this Dimensions, materials & Qutation.
```

If `job_clauses` referenced the library, editing a clause for one customer
would silently rewrite every quotation ever issued. So the flow is: pick from
the library, then edit the copy freely. A new job pre-selects every `active`
clause of each kind in library order, which makes the common case zero clicks.

## Making data entry fast

This is the part that determines whether the system is used. RC194's wardrobe
has twelve specification lines. Across just the two sample documents,
`All exposed edges sealed with 1mm PVC edge banding` appears eight times and
`High Quality Branded Soft Closing Hinges` three times.

So `spec_snippets` is load-bearing, not a nice-to-have:

- **Autocomplete.** Both the label and value fields of a specification line
  suggest from every line previously saved, ranked by `use_count` then
  recency. Saving a job upserts each of its lines into the snippet table and
  increments the count, so the library builds itself with no curation step.
- **Duplicate option.** Copies an option with all its specification lines, for
  the RC194 case where Option 02 differs from Option 01 in four lines out of
  six.
- **Duplicate unit** and **duplicate whole job**, since most jobs are
  variations on a previous one.
- **Clause pre-selection**, as above.

Without these an admin types twelve lines per unit by hand and returns to Word.

## PDF generation

**`@react-pdf/renderer`.** Pure JavaScript, no browser binary, runs on Vercel's
Node runtime, and React-idiomatic so it matches the rest of the codebase.

Rejected: Puppeteer with `@sparticuz/chromium`, which gives real CSS but costs
a ~50MB deployment and multi-second cold starts. These documents are a header
block, one table and a footer — not worth it.

**Bullet glyphs are drawn, not typed.** `❖` (U+2756) and `➢` (U+27A2) are not
in the standard PDF fonts, and embedded-font coverage for them is
unpredictable. Rendering them as small inline SVG shapes — a four-pointed
diamond and a right-pointing arrowhead — removes the dependency entirely. This
is the one part of the PDF work most likely to look correct locally and render
as `□` in production, so it is called out here.

The layout reproduces the existing document rather than redesigning it: the
company block and logo header, `QUOTATION` title, client details, the
`DATE / QUOTATION / SALES PERSON` meta block, the
`DESCRIPTION | PRICE | QTY/UNITS | TOTAL` table, the
`Our Furniture Is Made From The Finest Quality Materials…` tagline, terms,
the two-column signature block, and the red italic
`Thank You For Your Business!`.

### Documents are immutable snapshots

Generating a document writes a `documents` row holding both the Blob URL of the
PDF and a `jsonb` **snapshot** of the exact data it was rendered from. Editing
the job afterwards never rewrites an issued PDF; regenerating creates a new
row. For a document that states a price and gets signed, the audit trail is
worth the storage.

The snapshot is a self-contained structure — customer details, units, options,
specification lines, clause text, totals — with no foreign keys, so a document
can be re-rendered years later even if the customer record has since changed.

## Email delivery

Resend, already a dependency and already used by `src/app/api/enquiry/route.ts`.
A new `DOCS_FROM_EMAIL` keeps document mail separable from enquiry mail. The
PDF is attached, and the body carries the job reference and the portal link.

Every send updates `documents.sent_to` and `sent_at`, so the admin can see at a
glance what has actually gone out. A send failure must never be reported as
success — the same rule the enquiry route already follows.

The admin can always download the PDF instead, for manual WhatsApp delivery.

## Customer portal

`/j/<token>`, where the token is 32 random bytes base64url-encoded, stored on
the job and regenerable if a link leaks. No login — the token is the
credential, which is standard for this kind of link and appropriate given the
information exposed is the customer's own.

Read-only: current status, estimation date, 3D art gallery, quotation or order
detail, and download links for whichever documents have been issued.

Deliberately excluded: online acceptance or option selection by the customer.
It was not requested and would add an approval state machine. The model
supports adding it later without migration.

The route sits outside the `/admin` matcher in `src/proxy.ts` and must be
verified not to be caught by it.

## Admin routes

```
/admin                        existing dashboard, three new tiles
/admin/jobs                   list: ref, customer, stage, status, total, date
/admin/jobs/new               create
/admin/jobs/[id]              edit — units, options, spec lines, money
/admin/jobs/[id]/order        order panel — selection, terms, warranty
/admin/jobs/[id]/documents    generate, download, send, history
/admin/clauses                terms and warranty libraries
/admin/customers              list and edit
```

All under the existing `(protected)` route group, so
`verifyAdminSession()` in its layout remains the single authoritative auth
gate, exactly as the existing site-details and testimonials sections work.
Mutations are Server Actions calling `verifyAdminSession()` themselves, since a
Server Action is a separate entry point that the layout does not cover — the
pattern already established in
`src/app/admin/(protected)/testimonials/actions.ts`.

Each section gets a `loading.tsx` using the existing `AdminLoadingScreen`.

## Module boundaries

Pure, independently testable logic separated from I/O:

| Module | Responsibility |
|--------|----------------|
| `src/lib/money.ts` | cents parsing and formatting |
| `src/lib/jobs/totals.ts` | `resolvedOption`, `isResolved`, `totals` |
| `src/lib/jobs/reference.ts` | `RC00195` formatting |
| `src/lib/jobs/snapshot.ts` | job rows → document snapshot |
| `src/lib/jobs/schema.ts` | Zod schemas for every form |
| `src/pdf/*` | react-pdf components, snapshot in, PDF out |
| `src/lib/jobs/mail.ts` | Resend delivery |

The PDF components take a snapshot and nothing else — no database access — so
they can be rendered in tests from a fixture.

## Testing

Following the existing vitest setup:

- **Pure logic** — `money`, `totals`, `reference`, `snapshot` — unit tested
  directly. The totals rule gets explicit RC188 (resolves, totals present) and
  RC194 (unresolved, totals absent) cases built from the real documents as
  fixtures.
- **Zod schemas** tested for accept and reject, as `enquirySchema.test.ts` does.
- **Server actions** tested for their validation and authorisation paths.
- **Components** with Testing Library, as the existing admin forms are.
- **PDF** asserted at the document-tree level rather than by rendering bytes:
  given a snapshot, the component tree contains the expected rows and omits the
  totals block when unresolved.

## Environment

One new variable, added to `.env.example`:

```
# Verified sender address quotation, invoice and warranty documents are sent
# from (must be a domain verified in Resend)
DOCS_FROM_EMAIL=
```

`RESEND_API_KEY`, `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` are already
present and are reused.

## Constraints

- Next.js 16.2.12. Its API surface differs from older versions; the bundled
  docs in `node_modules/next/dist/docs/` are authoritative and must be
  consulted before writing route handlers, Server Actions or metadata, per
  `AGENTS.md`.
- Single shared admin login. No per-user accounts, so `sales_person` is free
  text with autocomplete from past values, not a user reference, and there is
  no per-user audit trail.
- Currency is LKR throughout. No multi-currency.

## Open items deferred by choice

- Customer-facing online acceptance of a quotation
- Per-user admin accounts and an audit log
- Quotation expiry automation (clause 3 states 20 days; not enforced)
- Reporting and revenue dashboards
