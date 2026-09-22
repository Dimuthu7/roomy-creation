'use server'
import { randomUUID } from 'crypto'
import { desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { customers, jobDocuments, jobs, payments } from '@/db/schema'
import { paymentFormSchema } from '@/lib/jobs/schema'
import { formatReceiptNumber } from '@/lib/jobs/reference'
import { buildReceiptSnapshot } from '@/lib/jobs/snapshot'
import { renderReceiptPdf } from '@/pdf/ReceiptDocument'
import { getJobBalance } from '@/lib/jobs/queries'

export interface ActionState {
  error?: string
  success?: boolean
}

/** Recording a payment never changes jobs.stage — see this slice's central
 *  invariant. The admin confirms the order separately, from the job header. */
export async function recordPayment(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  if (!jobId) return { error: 'Missing job id.' }

  const parsed = paymentFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  await db.insert(payments).values({
    id: randomUUID(),
    jobId,
    kind: parsed.data.kind,
    amountCents: parsed.data.amountCents,
    paidAt: parsed.data.paidAt,
    method: parsed.data.method,
    note: parsed.data.note,
  })

  revalidatePath(`/admin/jobs/${jobId}/payments`)
  return { success: true }
}

/** Plain (formData)-only signature, matching deleteJob/setJobStatus's convention for
 *  actions with no per-field feedback. A receipt already issued for this payment is
 *  unaffected — job_documents.payment_id is ON DELETE SET NULL, not CASCADE. */
export async function deletePayment(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const jobId = String(formData.get('jobId') ?? '')
  if (!id || !jobId) return

  await db.delete(payments).where(eq(payments.id, id))

  revalidatePath(`/admin/jobs/${jobId}/payments`)
}

/** One receipt per payment, generated on demand rather than automatically — an admin
 *  may record several payments before printing anything, or reprint one later. Always
 *  a fresh row (immutable-snapshot rule): re-generating a receipt for the same
 *  payment produces a second document, not an overwrite. */
export async function generateReceipt(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  const paymentId = String(formData.get('paymentId') ?? '')
  if (!jobId || !paymentId) return { error: 'Missing payment id.' }

  const [job] = await db.select().from(jobs).innerJoin(customers, eq(customers.id, jobs.customerId)).where(eq(jobs.id, jobId))
  if (!job) return { error: 'Quotation not found.' }

  const allPayments = await db.select().from(payments).where(eq(payments.jobId, jobId)).orderBy(desc(payments.createdAt))
  const payment = allPayments.find((p) => p.id === paymentId)
  if (!payment) return { error: 'Payment not found.' }

  const balance = await getJobBalance(jobId)

  // Sequence numbers come from the shared `counters` table, exactly like job refs —
  // see allocateRef in queries.ts for the identical single-statement pattern.
  const counterRows = await db.execute<{ value: number }>(
    sql`update counters set value = value + 1 where key = 'receipt' returning value`,
  )
  const seq = Number(counterRows.rows[0]?.value)
  if (!Number.isInteger(seq)) {
    return { error: "Counter 'receipt' is missing — run npm run db:seed." }
  }

  const snapshot = buildReceiptSnapshot({
    number: formatReceiptNumber(seq),
    ref: job.jobs.ref,
    customerName: job.customers.name,
    amountCents: payment.amountCents,
    kind: payment.kind as 'advance' | 'final' | 'other',
    note: payment.note,
    paidAt: payment.paidAt,
    method: payment.method,
    totalCents: balance?.totals?.totalCents ?? null,
    paymentsIncludingThis: allPayments.filter((p) => p.createdAt <= payment.createdAt),
  })

  const pdf = await renderReceiptPdf(snapshot)
  const blob = await put(`receipts/${snapshot.number}-${Date.now()}.pdf`, pdf, { access: 'public' })

  await db.insert(jobDocuments).values({
    id: randomUUID(),
    jobId,
    kind: 'receipt',
    number: snapshot.number,
    blobUrl: blob.url,
    snapshot,
    paymentId,
  })

  revalidatePath(`/admin/jobs/${jobId}/payments`)
  revalidatePath(`/admin/jobs/${jobId}/documents`)
  return { success: true }
}
