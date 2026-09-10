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
