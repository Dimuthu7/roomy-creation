import { sql } from 'drizzle-orm'
import { bigint, boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

// Singleton row — always id 1. Every column but `name` is nullable: null is this
// table's TBC, converted to/from the app's `Maybe<T>` sentinel in src/data/site.ts.
export const siteConfig = pgTable('site_config', {
  id: integer('id').primaryKey().default(1),
  name: text('name').notNull().default('Roomy Creations'),
  url: text('url'),
  phone: text('phone'),
  whatsappNumber: text('whatsapp_number'),
  email: text('email'),
  addressLines: text('address_lines').array(),
  city: text('city'),
  postalCode: text('postal_code'),
  districts: text('districts').array(),
  openingHours: text('opening_hours').array(),
  socialFacebook: text('social_facebook'),
  socialInstagram: text('social_instagram'),
  socialTiktok: text('social_tiktok'),
  mapEmbedUrl: text('map_embed_url'),
  freeMeasurementVisit: boolean('free_measurement_visit'),
  figuresYearsInBusiness: integer('figures_years_in_business'),
  figuresHomesFitted: integer('figures_homes_fitted'),
  figuresUnitsDelivered: integer('figures_units_delivered'),
  figuresDistrictsCovered: integer('figures_districts_covered'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// One row per planned gallery slot (work-01 .. work-24). `image` null means the
// slot has no photo yet — the public site's getWorks() only returns rows with
// a non-null image, mirroring the old ALL_WORKS/WORKS(DELIVERED_COUNT) split.
export const works = pgTable('works', {
  id: text('id').primaryKey(),
  position: integer('position').notNull(),
  category: text('category').notNull(),
  ratio: text('ratio').notNull(),
  image: text('image'),
  beforeImage: text('before_image'),
  title: text('title').notNull(),
  materials: text('materials'),
  dimensions: text('dimensions'),
  hardware: text('hardware'),
  propertyType: text('property_type'),
  district: text('district'),
  year: integer('year'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// One row per testimonial, from either source. `fbReviewId` is unique so a re-sync
// upserts an existing Facebook review's content instead of duplicating it, while
// leaving `visible`/`position` untouched — those are admin-curated and must survive
// a sync. `recommended` (Facebook's thumbs up/down) and `rating` (manual entries
// only) are both nullable since only one ever applies to a given row. New rows
// default `visible` to false: a freshly synced review must be reviewed by an admin
// before it can appear on the public site.
export const testimonials = pgTable('testimonials', {
  id: text('id').primaryKey(),
  source: text('source').notNull(), // 'facebook' | 'manual'
  fbReviewId: text('fb_review_id').unique(),
  authorName: text('author_name').notNull(),
  avatarUrl: text('avatar_url'),
  reviewText: text('review_text').notNull(),
  reviewUrl: text('review_url'),
  recommended: boolean('recommended'),
  rating: integer('rating'),
  reviewedAt: timestamp('reviewed_at').notNull().defaultNow(),
  visible: boolean('visible').notNull().default(false),
  position: integer('position'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

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
    status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'finished' | 'cancelled'
    freeDelivery: boolean('free_delivery').notNull().default(false),
    deliveryChargeCents: bigint('delivery_charge_cents', { mode: 'number' }),
    discountLabel: text('discount_label').notNull().default('Cash Discount'),
    discountCents: bigint('discount_cents', { mode: 'number' }).notNull().default(0),
    advanceCents: bigint('advance_cents', { mode: 'number' }),
    // The order document's editable terms sentence (e.g. "Balance payable on
    // completion of installation."). Null falls back to DEFAULT_PAYMENT_TERMS at
    // render time, so no backfill is needed for jobs created before this column existed.
    paymentTerms: text('payment_terms'),
    // Set once, by the Confirm order action — separate from quotationDate because the
    // order document needs its own date, not the quotation's.
    confirmedAt: timestamp('confirmed_at'),
    // Set by the Complete order action, cleared by nothing — a status reversal leaves
    // it in place and a re-completion re-stamps it, so it always names the current
    // completion rather than the first one. Mirrors confirmedAt exactly.
    completedAt: timestamp('completed_at'),
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
    kind: text('kind').notNull(), // 'quotation' | 'order' | 'receipt' | 'completion' | 'advance_invoice' | 'final_invoice'
    number: text('number').notNull(),
    // 'pdf' | 'docx'. A Word row is a sibling of an existing 'pdf' row (same kind,
    // number and snapshot) generated on demand so the admin can edit it — see
    // generateWordDocument. Defaults 'pdf' so every row written before this column
    // existed reads correctly without a backfill.
    format: text('format').notNull().default('pdf'),
    blobUrl: text('blob_url').notNull(),
    snapshot: jsonb('snapshot').notNull(),
    // Which payment a 'receipt' document was issued for. Nullable and ON DELETE SET
    // NULL, not CASCADE: deleting the payment must never delete the receipt already
    // handed to the customer — the receipt's snapshot is self-contained regardless.
    paymentId: text('payment_id').references(() => payments.id, { onDelete: 'set null' }),
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

// ---------------------------------------------------------------------------
// Expenses. See docs/superpowers/specs/2026-09-24-admin-expenses-design.md
// ---------------------------------------------------------------------------

// Shops Material can be bought from. A table rather than free text in `details`:
// typed strings would produce "Ajith Hardware", "ajith hardware" and "Ajith Hardwares"
// as three distinct shops inside a month, after which no per-shop question could be
// answered. The case-insensitive unique index is the structural guarantee, the same
// role the partial unique index plays on unit_options.
export const shops = pgTable(
  'shops',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('shops_name_lower').on(sql`lower(${t.name})`)],
)

// One row per expense, in any category. The four columns every category shares are
// real columns — so the list, the filters and the monthly breakdown are written once
// and never change — while the per-category fields live in `details`, shaped by that
// category's Zod schema in src/lib/expenses/schema.ts. Adding a category is a registry
// entry and needs no migration.
//
// `details` is not type-checked by Postgres; the Zod schema is the only guard. That is
// acceptable here because there is exactly one writer (the addExpense server action)
// and this is internal bookkeeping — it would not be acceptable for `jobs`.
//
// `amount_cents` is ALWAYS the net cost: price minus discount for material, the single
// money field for the rest. The gross price and discount are kept in `details`, so the
// breakdown sums one column without knowing what category a row is.
export const expenses = pgTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    category: text('category').notNull(), // 'material' | 'salary' | 'business_capital' | 'transport'
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    spentAt: date('spent_at').notNull(),
    remark: text('remark'),
    details: jsonb('details').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('expenses_spent_at_idx').on(t.spentAt), index('expenses_category_idx').on(t.category)],
)
