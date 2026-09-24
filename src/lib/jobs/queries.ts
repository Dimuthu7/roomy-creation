import 'server-only'
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { customers, jobClauses, jobUnits, jobs, optionSpecs, payments, unitOptions } from '@/db/schema'
import { JOB_STATUSES } from './schema'
import { formatJobRef } from './reference'
import { jobTotals } from './totals'
import { paymentPosition } from './payments'
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

export const JOBS_PAGE_SIZE = 10

export interface JobListFilters {
  /** Matched against ref, customer name and customer phone — whichever hits. */
  q?: string
  status?: string
  /** Inclusive bounds on quotation_date, as 'YYYY-MM-DD' — lexicographic order
   *  matches date order for that format, so these compare as plain strings. */
  from?: string
  to?: string
  /** 1-based. Defaults to 1. */
  page?: number
}

export async function listJobs(filters: JobListFilters = {}) {
  const conditions = []

  const q = filters.q?.trim()
  if (q) {
    const pattern = `%${q}%`
    conditions.push(or(ilike(jobs.ref, pattern), ilike(customers.name, pattern), ilike(customers.phone, pattern)))
  }
  if (filters.status && JOB_STATUSES.includes(filters.status as (typeof JOB_STATUSES)[number])) {
    conditions.push(eq(jobs.status, filters.status))
  }
  if (filters.from) conditions.push(gte(jobs.quotationDate, filters.from))
  if (filters.to) conditions.push(lte(jobs.quotationDate, filters.to))

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1

  const [rows, [{ total }]] = await Promise.all([
    db
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
      .where(where)
      .orderBy(desc(jobs.refSeq))
      .limit(JOBS_PAGE_SIZE)
      .offset((page - 1) * JOBS_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(jobs)
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .where(where),
  ])

  return { rows, page, totalPages: Math.max(1, Math.ceil(total / JOBS_PAGE_SIZE)) }
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
