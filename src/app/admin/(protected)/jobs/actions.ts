'use server'
import { randomBytes, randomUUID } from 'crypto'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import {
  clauseLibrary,
  customers,
  jobClauses,
  jobUnits,
  jobs,
  optionSpecs,
  specSnippets,
  unitOptions,
} from '@/db/schema'
import { customerFormSchema, JOB_STATUSES, jobDetailsFormSchema, jobUnitsSchema } from '@/lib/jobs/schema'
import { allocateRef } from '@/lib/jobs/queries'

export interface ActionState {
  error?: string
  success?: boolean
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Creates the customer and the job in one step, then redirects straight to the
 *  edit screen — a new quotation starts as customer details plus an empty unit list,
 *  everything else (units, money, clauses) is filled in there. Every `active` library
 *  clause is copied onto the job immediately, so the common case of "use our standard
 *  terms" is zero clicks on the edit screen. */
export async function createJob(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const parsed = customerFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const customer = parsed.data

  const quotationDateInput = formData.get('quotationDate')
  const quotationDate =
    typeof quotationDateInput === 'string' && quotationDateInput.trim() !== '' ? quotationDateInput : today()

  const customerId = randomUUID()
  await db.insert(customers).values({
    id: customerId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    addressLines: customer.addressLines,
    city: customer.city,
    district: customer.district,
    notes: customer.notes,
  })

  const { seq, ref } = await allocateRef()

  const jobId = randomUUID()
  await db.insert(jobs).values({
    id: jobId,
    ref,
    refSeq: seq,
    customerId,
    quotationDate,
    stage: 'quotation',
    status: 'pending',
    portalToken: randomBytes(32).toString('base64url'),
  })

  const activeClauses = await db.select().from(clauseLibrary).where(eq(clauseLibrary.active, true))
  if (activeClauses.length > 0) {
    await db.insert(jobClauses).values(
      activeClauses.map((clause) => ({
        id: randomUUID(),
        jobId,
        kind: clause.kind,
        position: clause.position,
        body: clause.body,
        emphasis: clause.emphasis,
      })),
    )
  }

  revalidatePath('/admin/jobs')
  redirect(`/admin/jobs/${jobId}`)
}

/** Plain (formData)-only signature, bound directly as a form action — matches the
 *  convention in testimonials/actions.ts and clauses/actions.ts for actions with no
 *  per-row pending/error UI to feed. Children cascade, so deleting a job removes its
 *  units, options, spec lines, clauses and documents in one statement. */
export async function deleteJob(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await db.delete(jobs).where(eq(jobs.id, id))

  revalidatePath('/admin/jobs')
  redirect('/admin/jobs')
}

export async function setJobStatus(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !JOB_STATUSES.includes(status as (typeof JOB_STATUSES)[number])) return

  await db
    .update(jobs)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobs.id, id))

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${id}`)
}

// The clause pickers post their draft as JSON, same reasoning as jobUnitsSchema —
// nested client state doesn't fit flat FormData keys. A blank body is dropped rather
// than rejected, matching option_specs' "empty row is not an error" rule.
const jobClauseListSchema = z
  .array(z.object({ body: z.string(), emphasis: z.boolean().default(false) }))
  .transform((clauses) => clauses.map((c) => ({ ...c, body: c.body.trim() })).filter((c) => c.body !== ''))

export async function saveJob(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing job id.' }

  // Object.fromEntries(formData) rather than reading fields individually: the checkbox
  // schema (freeDelivery) relies on an unchecked box's key being genuinely absent from
  // the resulting object, not explicitly null — see schema.ts's `checkbox` comment.
  const flat = Object.fromEntries(formData)

  const detailsParsed = jobDetailsFormSchema.safeParse(flat)
  if (!detailsParsed.success) {
    return { error: detailsParsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // `notes` is submitted twice on this one <form> — the customer's and the job's —
  // so the customer's textarea is named `customerNotes` and remapped here rather than
  // colliding on the shared key `notes` that jobDetailsFormSchema also reads from flat.
  const customerParsed = customerFormSchema.safeParse({ ...flat, notes: flat.customerNotes })
  if (!customerParsed.success) {
    return { error: customerParsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const unitsRaw = formData.get('units')
  if (typeof unitsRaw !== 'string') return { error: 'Could not read the units.' }
  let unitsJson: unknown
  try {
    unitsJson = JSON.parse(unitsRaw)
  } catch {
    return { error: 'Could not read the units.' }
  }
  const unitsParsed = jobUnitsSchema.safeParse(unitsJson)
  if (!unitsParsed.success) {
    return { error: unitsParsed.error.issues[0]?.message ?? 'The units could not be saved.' }
  }

  const termsRaw = formData.get('terms')
  const warrantyRaw = formData.get('warranty')
  let termsJson: unknown
  let warrantyJson: unknown
  try {
    termsJson = typeof termsRaw === 'string' && termsRaw !== '' ? JSON.parse(termsRaw) : []
    warrantyJson = typeof warrantyRaw === 'string' && warrantyRaw !== '' ? JSON.parse(warrantyRaw) : []
  } catch {
    return { error: 'Could not read the terms or warranty clauses.' }
  }
  const termsParsed = jobClauseListSchema.safeParse(termsJson)
  const warrantyParsed = jobClauseListSchema.safeParse(warrantyJson)
  if (!termsParsed.success || !warrantyParsed.success) {
    return { error: 'Could not read the terms or warranty clauses.' }
  }

  const [existing] = await db.select({ customerId: jobs.customerId }).from(jobs).where(eq(jobs.id, id))
  if (!existing) return { error: 'Quotation not found.' }

  await db
    .update(customers)
    .set({
      name: customerParsed.data.name,
      phone: customerParsed.data.phone,
      email: customerParsed.data.email,
      addressLines: customerParsed.data.addressLines,
      city: customerParsed.data.city,
      district: customerParsed.data.district,
      notes: customerParsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, existing.customerId))

  await db
    .update(jobs)
    .set({
      salesPerson: detailsParsed.data.salesPerson,
      quotationDate: detailsParsed.data.quotationDate,
      estimationDate: detailsParsed.data.estimationDate,
      freeDelivery: detailsParsed.data.freeDelivery,
      deliveryChargeCents: detailsParsed.data.deliveryChargeCents,
      discountLabel: detailsParsed.data.discountLabel,
      discountCents: detailsParsed.data.discountCents,
      advanceCents: detailsParsed.data.advanceCents,
      status: detailsParsed.data.status,
      notes: detailsParsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id))

  // Wholesale replacement rather than a diff: the tree is small, the code is a
  // fraction of the size, and there is no id-stability requirement across saves —
  // see the plan's Task 10 note.
  const unitRows: (typeof jobUnits.$inferInsert)[] = []
  const optionRows: (typeof unitOptions.$inferInsert)[] = []
  const specRows: (typeof optionSpecs.$inferInsert)[] = []
  // spec_snippets_text is a plain unique index over (label, value); Postgres never
  // treats two NULLs as conflicting under a plain unique index, so a null label would
  // silently bypass ON CONFLICT and insert a fresh row every save instead of
  // incrementing use_count. Coalescing to '' here (snippets only — option_specs keeps
  // the real null) sidesteps that without a schema change. Task 11's autocomplete
  // must treat '' the same as "no label" for this table.
  const snippetLabels: { label: string; value: string }[] = []

  unitsParsed.data.forEach((unit, unitIndex) => {
    const unitId = randomUUID()
    unitRows.push({ id: unitId, jobId: id, position: unitIndex, title: unit.title })
    unit.options.forEach((option, optionIndex) => {
      const optionId = randomUUID()
      optionRows.push({
        id: optionId,
        unitId,
        position: optionIndex,
        label: option.label,
        priceCents: option.priceCents,
        qty: option.qty,
        selected: option.selected,
      })
      option.specs.forEach((spec, specIndex) => {
        specRows.push({ id: randomUUID(), optionId, position: specIndex, label: spec.label, value: spec.value })
        snippetLabels.push({ label: spec.label ?? '', value: spec.value })
      })
    })
  })

  await db.delete(jobUnits).where(eq(jobUnits.jobId, id))
  if (unitRows.length > 0) await db.insert(jobUnits).values(unitRows)
  if (optionRows.length > 0) await db.insert(unitOptions).values(optionRows)
  if (specRows.length > 0) await db.insert(optionSpecs).values(specRows)
  if (snippetLabels.length > 0) {
    await db
      .insert(specSnippets)
      .values(snippetLabels.map((s) => ({ id: randomUUID(), label: s.label, value: s.value, useCount: 1 })))
      .onConflictDoUpdate({
        target: [specSnippets.label, specSnippets.value],
        set: { useCount: sql`${specSnippets.useCount} + 1`, lastUsedAt: new Date() },
      })
  }

  await db.delete(jobClauses).where(eq(jobClauses.jobId, id))
  const clauseRows: (typeof jobClauses.$inferInsert)[] = [
    ...termsParsed.data.map((c, i) => ({
      id: randomUUID(),
      jobId: id,
      kind: 'terms',
      position: i,
      body: c.body,
      emphasis: c.emphasis,
    })),
    ...warrantyParsed.data.map((c, i) => ({
      id: randomUUID(),
      jobId: id,
      kind: 'warranty',
      position: i,
      body: c.body,
      emphasis: c.emphasis,
    })),
  ]
  if (clauseRows.length > 0) await db.insert(jobClauses).values(clauseRows)

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${id}`)
  return { success: true }
}
