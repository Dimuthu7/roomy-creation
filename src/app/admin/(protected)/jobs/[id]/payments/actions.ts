'use server'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { payments } from '@/db/schema'
import { paymentFormSchema } from '@/lib/jobs/schema'

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
