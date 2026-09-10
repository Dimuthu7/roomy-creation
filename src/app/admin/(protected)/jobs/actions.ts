'use server'
import { randomBytes, randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { clauseLibrary, customers, jobClauses, jobs } from '@/db/schema'
import { customerFormSchema, JOB_STATUSES } from '@/lib/jobs/schema'
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
