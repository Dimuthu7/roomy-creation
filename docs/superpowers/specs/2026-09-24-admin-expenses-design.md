# Admin expenses

**Date:** 2026-09-24
**Status:** approved design, not yet implemented

## Problem

The admin portal records everything Roomy Creations *earns* — quotations,
orders, payments, completion — and nothing it *spends*. Boards bought from a
hardware shop, wages paid to a part-time carpenter, a new router for the
workshop, a three-wheeler hire to a delivery: all of it lives in a notebook or
in nobody's head at all.

The immediate need is modest and should stay modest: a place to type an expense
as it happens, and a way to read back where the month's money went. This is
bookkeeping, not accounting — there is no ledger, no reconciliation, no
supplier account.

The request arrived as "Inventory Management", but nothing in it tracks
inventory. All four categories record money leaving the business; none record
stock on hand, quantities, or units consumed by a job. Naming it *Expenses*
keeps it honest and leaves the name *Inventory* available if real stock
tracking is ever built.

## Scope

One screen at `/admin/expenses`, reached from a new tile on the admin
dashboard. It does three things:

1. Add an expense, in one of four categories, each with its own fields.
2. Show a per-category breakdown and grand total for a chosen month.
3. List that month's entries, newest first, paginated, each deletable.

**Explicitly out of scope**, each a clean follow-on the schema already allows:
editing rows, linking expenses to jobs, stock quantities, CSV export, charts,
and a UI for managing categories.

## Decisions taken during design

Four questions were settled before the design, and the rest of the document
depends on the answers:

| Question | Answer |
|---|---|
| Expense tracking or real inventory? | Expense tracking. No stock levels, ever. |
| Link expenses to jobs for per-job costing? | No. This is a standalone section. |
| What does the page show beyond a list? | Per-category monthly breakdown plus a total. |
| Who adds new categories? | A developer, in code — one entry in a registry file. |

## Core decision: one table, shared columns plus a JSONB detail

Every category contributes the same four things — which category it is, a net
amount, a date, and a remark. Everything past that is category-specific.

```
expenses
  id            text primary key
  category      text not null        -- 'material' | 'salary' | 'business_capital' | 'transport'
  amount_cents  bigint not null      -- ALWAYS the net cost
  spent_at      date not null
  remark        text
  details       jsonb not null       -- the category-specific fields
  created_at    timestamp not null
  updated_at    timestamp not null

  index on (spent_at)
  index on (category)
```

The list, the filters and the breakdown touch only the shared columns, so they
are written once and never change. Adding a fifth category is one block in the
registry and **no migration at all** — which is the stated requirement, met
structurally rather than by discipline.

Two alternatives were considered and rejected:

**Every field as its own nullable column.** Fully typed in Postgres and
queryable in SQL, but the table grows wide and increasingly meaningless — an
`employee_type` column on a Transport row is noise — and every new category
costs a migration. Survivable, but it fights the extensibility requirement
rather than serving it.

**A table per category.** Cleanest per-category typing, worst for everything
asked for: the list and the breakdown become a four-way `UNION`, and a new
category means a new table plus edits to every shared query.

The cost of the chosen approach is real and worth stating: `details` is not
type-checked by Postgres, so the Zod schema is the only guard on its shape.
That is acceptable here because there is exactly one writer — the server action
— and the data is internal bookkeeping, not a document a customer signs. It
would not be acceptable for `jobs`.

### `amount_cents` is always the net cost

For Material, `amount_cents` is price minus discount, computed once in the
server action; for the other three it is the single money field. The gross
price and the discount are both kept in `details`, so what you were quoted is
never lost.

This denormalisation is deliberate. It means the breakdown and the total never
need to know what category a row is — they sum one column. The alternative,
computing net per category at read time, pushes category knowledge into every
reporting query and would have to be repeated for each new category.

## Second table: shops

```
shops
  id          text primary key
  name        text not null
  created_at  timestamp not null

  unique index on lower(name)
```

Material's Shop field is a dropdown the user can extend, so shops are rows, not
a typed string in `details`. Storing free text would produce "Ajith Hardware",
"ajith hardware" and "Ajith Hardwares" as three distinct shops within a month,
and no per-shop question could ever be answered afterwards.

The case-insensitive unique index is the structural guarantee — the same role
the partial unique index plays on `unit_options` — rather than a check the
action could forget to run.

Adding a shop happens inline: the dropdown carries an "Add new shop…" option
that reveals a text input in the same form. There is no separate management
screen, because a list of shop names does not earn one.

## The category registry

`src/lib/expenses/categories.ts` holds one entry per category: a key, a label,
an ordered list of field descriptors, a function producing the net
`amount_cents` from validated input, and a function producing the one-line
summary shown in the list's DETAIL column.

Field descriptors come from a closed set of kinds:

| Kind | Renders as |
|---|---|
| `text` | single-line input |
| `textarea` | multi-line input |
| `money` | text input parsed by `parseMoneyToCents` |
| `date` | date input |
| `radio` | radio group over fixed options |
| `select` | dropdown over fixed options |
| `shop` | dropdown over the `shops` table, with inline "Add new shop…" |

The form renders from these descriptors rather than each category owning a
hand-written component. That is what makes adding a category a single-file
change instead of a form, a validator, and a list column. Because each entry
also supplies its own summary function, a new category brings its list
rendering with it.

If a future category ever needs a field kind this set cannot express, the right
move is to add a kind — not to special-case one category inside the renderer.

### The four categories

**Material**

| Field | Kind | Required |
|---|---|---|
| Name | `text` | yes |
| Description | `textarea` | no |
| Price | `money` | yes |
| Discount | `money` | no, defaults to 0 |
| Shop | `shop` | yes |
| Date | `date` | yes, defaults to today |
| Remark | `text` | no |

Net amount: `price − discount`. Summary: `name · shop name`.

**Salaries**

| Field | Kind | Required |
|---|---|---|
| Employee type | `radio` — Part time / Permanent | yes, Part time pre-selected |
| Employee name | `text` | no |
| Salary | `money` | yes |
| Date | `date` | yes, defaults to today |
| Remark | `text` | no |

Net amount: the salary. Summary: `employee name · employee type`, falling back
to the type alone when no name was given.

The name field is optional rather than absent (as originally specified) or a
managed list. Optional captures who was paid without committing anyone to
maintaining an employee table, and stops the name from being buried in Remark
where it is unsearchable. If per-employee totals later matter, the free-text
values will already show who the real employees are.

**Business Capital**

| Field | Kind | Required |
|---|---|---|
| Type | `select` — Workshop cost / Vehicle cost / Tools / Repair / Other | yes |
| Amount | `money` | yes |
| Date | `date` | yes, defaults to today |
| Remark | `text` | no |

Net amount: the amount. Summary: the type label.

The type list stays in code rather than getting the Shop treatment: it is a
fixed five with an "Other" escape hatch. If "Other" starts dominating in
practice, that is the signal to promote it to a table.

**Transport**

| Field | Kind | Required |
|---|---|---|
| Price | `money` | yes |
| Date | `date` | yes, defaults to today |
| Remark | `text` | no |

Net amount: the price. Summary: the remark, or "Transport" when blank.

## The page

```
Expenses
Record what the business spends, by category.

┌ Add an expense ─────────────────────────────────────────┐
│  [ Material ] [ Salaries ] [ Business Capital ] [ Transport ]
│                                                          │
│  Name         [ 18mm MDF board                        ]  │
│  Description  [                                       ]  │
│  Price        [ 50,000.00 ]   Discount  [ 2,500.00 ]     │
│  Shop         [ Ajith Hardware            ▾ ]            │
│  Date         [ 2026-09-24 ]                             │
│  Remark       [                                       ]  │
│                                          [ Save expense ]│
└──────────────────────────────────────────────────────────┘

Month [ September 2026 ▾ ]      Category [ All ▾ ]

  Material          386,500.00
  Salaries          145,000.00
  Business Capital   62,000.00
  Transport          18,400.00
  ─────────────────────────────
  Total             611,900.00      42 entries

DATE        CATEGORY   DETAIL                      AMOUNT
24 Sep 26   Material   18mm MDF board · Ajith Hdw   47,500.00   [×]
23 Sep 26   Salaries   Sunil · Part time            12,000.00   [×]
...
                                        ‹ 1 2 3 ›
```

**The category selector is four buttons, not a dropdown.** With four options,
buttons show every choice at once and switching costs one click instead of two.
The fields below swap immediately — a client component holding the selected
category in React state, submitting through `useActionState` like every other
admin form.

**Filters live in the URL** (`?month=2026-09&category=material&page=2`),
matching `JobFilters.tsx` and `JobsPagination.tsx`, so a filtered view is
shareable, bookmarkable and back-button-safe. The default is the current month.

**The breakdown reflects the filters above it** — it is one query over the same
rows the list shows, not a separate reporting concept. Ten rows per page,
matching the quotations list.

**Deletion, not editing.** Each row carries a delete button with a confirm. A
mistyped row takes seconds to delete and re-enter; editing would mean
prefilling and re-validating the whole dynamic form for a rare case. The schema
permits edit to be added later without change.

## Validation and failure modes

Validation lives in `src/lib/expenses/schema.ts` — one Zod schema per category,
built from the registry. The server action returns the first issue as
`ActionState.error`, the shape `clauses/actions.ts` already uses, so the form's
error rendering matches the rest of the admin. Every action calls
`verifyAdminSession()` first.

| Failure | Handling |
|---|---|
| Bad money input | `parseMoneyToCents` rejects anything that is not a non-negative amount with at most two decimals. "45,000.00", "45000" and "45000.5" all parse. |
| Discount exceeds price | Rejected: *"Discount cannot be more than the price."* Enforced in the schema, not the UI — a negative expense would silently under-report the month. |
| Duplicate shop | "Add new shop" trims and matches case-insensitively; `ajith hardware` reuses the `Ajith Hardware` row. |
| Unknown category in a form post or URL | Registry lookup fails closed; the action returns an error rather than writing an unparseable `details` blob. |
| Month with no expenses | Breakdown shows zeros, list shows "No expenses in September 2026". Not a broken table. |

Future dates are accepted. Prepayment is real, and a date validator that fights
the user over it costs more than it saves.

## Testing

Following the repo's split: logic in `src/lib` with vitest unit tests, server
actions kept thin.

| File | Covers |
|---|---|
| `schema.test.ts` | Each category accepts valid input and rejects each missing required field; discount-over-price; net amount is price − discount for Material and the plain amount for the rest. |
| `categories.test.ts` | Every registry entry has a label, a non-empty field list, a summary function, and only known field kinds. |
| `totals.test.ts` | Grouping rows into per-category totals and a grand total, including the empty case. |
| `month.test.ts` | `"2026-09"` yields the correct start and end boundaries, including December rolling into the next year. |

`categories.test.ts` is the one that matters most for the extensibility
requirement: it means a half-added future category fails a test rather than
crashing the form in production.

## Files

**New**

| Path | Purpose |
|---|---|
| `src/lib/expenses/categories.ts` | the registry — the file a new category is added to |
| `src/lib/expenses/schema.ts` | Zod validation built from the registry |
| `src/lib/expenses/totals.ts` | breakdown and grand-total maths |
| `src/lib/expenses/month.ts` | month-string to date-range boundaries |
| `src/app/admin/(protected)/expenses/page.tsx` | the screen |
| `src/app/admin/(protected)/expenses/actions.ts` | add, delete, add-shop, queries |
| `src/app/admin/(protected)/expenses/ExpenseForm.tsx` | category selector + descriptor-driven fields |
| `src/app/admin/(protected)/expenses/ExpenseFilters.tsx` | month and category filters |
| `src/app/admin/(protected)/expenses/ExpenseBreakdown.tsx` | per-category totals |
| `src/app/admin/(protected)/expenses/ExpenseRow.tsx` | one list row with delete |
| `src/app/admin/(protected)/expenses/loading.tsx` | matching the other admin sections |
| a Drizzle migration | `expenses` and `shops` |

**Changed**

| Path | Change |
|---|---|
| `src/db/schema.ts` | two new tables |
| `src/app/admin/(protected)/page.tsx` | one entry in `TILES` |

The dashboard tile reads **Expenses** — *"Material, salaries, capital and
transport costs"*.
