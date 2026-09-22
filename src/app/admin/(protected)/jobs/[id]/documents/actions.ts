'use server'
import { randomUUID } from 'crypto'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { customers, jobDocuments, jobs } from '@/db/schema'
import { getJobBalance, loadJob } from '@/lib/jobs/queries'
import { buildOrderSnapshot, buildQuotationSnapshot } from '@/lib/jobs/snapshot'
import { renderOrderPdf } from '@/pdf/OrderDocument'
import { renderQuotationPdf } from '@/pdf/QuotationDocument'
import { sendDocumentEmail } from '@/lib/jobs/mail'

export interface ActionState {
  error?: string
  success?: boolean
}

export async function listDocuments(jobId: string) {
  return db.select().from(jobDocuments).where(eq(jobDocuments.jobId, jobId)).orderBy(desc(jobDocuments.createdAt))
}

/** Renders and stores a new quotation PDF. Always inserts a fresh row rather than
 *  updating one — see the spec's "Documents are immutable snapshots": editing the
 *  job afterwards must never rewrite a PDF a customer has already been sent. */
export async function generateQuotationPdf(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  if (!jobId) return { error: 'Missing job id.' }

  const loaded = await loadJob(jobId)
  if (!loaded) return { error: 'Quotation not found.' }
  if (loaded.units.length === 0) return { error: 'Add at least one unit before generating a PDF.' }

  const snapshot = buildQuotationSnapshot({
    ref: loaded.job.ref,
    quotationDate: loaded.job.quotationDate,
    salesPerson: loaded.job.salesPerson,
    customer: {
      name: loaded.customer.name,
      phone: loaded.customer.phone,
      email: loaded.customer.email,
      addressLines: loaded.customer.addressLines ?? [],
      city: loaded.customer.city,
      district: loaded.customer.district,
    },
    units: loaded.units,
    discountLabel: loaded.job.discountLabel,
    discountCents: loaded.job.discountCents,
    freeDelivery: loaded.job.freeDelivery,
    deliveryChargeCents: loaded.job.deliveryChargeCents,
    terms: loaded.terms.map((c) => ({ body: c.body, emphasis: c.emphasis })),
    warranty: loaded.warranty.map((c) => ({ body: c.body, emphasis: c.emphasis })),
  })

  const pdf = await renderQuotationPdf(snapshot)
  const blob = await put(`quotations/${loaded.job.ref}-${Date.now()}.pdf`, pdf, { access: 'public' })

  await db.insert(jobDocuments).values({
    id: randomUUID(),
    jobId,
    kind: 'quotation',
    number: loaded.job.ref,
    blobUrl: blob.url,
    snapshot,
  })

  revalidatePath(`/admin/jobs/${jobId}/documents`)
  return { success: true }
}

/** Refuses outside stage 'order' or while any unit is unresolved — the same
 *  invariant setJobStage enforces when confirming, checked again here because a
 *  document generator must never trust that the caller already checked. Reuses the
 *  job's own ref, never allocating a new number — see buildOrderSnapshot's doc
 *  comment. */
export async function generateOrderDocument(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  if (!jobId) return { error: 'Missing job id.' }

  const loaded = await loadJob(jobId)
  if (!loaded) return { error: 'Quotation not found.' }
  if (loaded.job.stage !== 'order') return { error: 'Confirm this quotation as an order first.' }

  const balance = await getJobBalance(jobId)
  if (!balance || !balance.totals) return { error: 'Every unit needs a chosen option before an order document can be generated.' }

  const snapshot = buildOrderSnapshot({
    ref: loaded.job.ref,
    quotationDate: loaded.job.quotationDate,
    confirmedDate: loaded.job.confirmedAt ? loaded.job.confirmedAt.toISOString().slice(0, 10) : loaded.job.quotationDate,
    salesPerson: loaded.job.salesPerson,
    customer: {
      name: loaded.customer.name,
      phone: loaded.customer.phone,
      email: loaded.customer.email,
      addressLines: loaded.customer.addressLines ?? [],
      city: loaded.customer.city,
      district: loaded.customer.district,
    },
    units: loaded.units,
    discountLabel: loaded.job.discountLabel,
    discountCents: loaded.job.discountCents,
    freeDelivery: loaded.job.freeDelivery,
    deliveryChargeCents: loaded.job.deliveryChargeCents,
    paymentTerms: loaded.job.paymentTerms,
    payments: balance.payments,
    terms: loaded.terms.map((c) => ({ body: c.body, emphasis: c.emphasis })),
    warranty: loaded.warranty.map((c) => ({ body: c.body, emphasis: c.emphasis })),
  })

  const pdf = await renderOrderPdf(snapshot)
  const blob = await put(`orders/${loaded.job.ref}-${Date.now()}.pdf`, pdf, { access: 'public' })

  await db.insert(jobDocuments).values({
    id: randomUUID(),
    jobId,
    kind: 'order',
    number: loaded.job.ref,
    blobUrl: blob.url,
    snapshot,
  })

  revalidatePath(`/admin/jobs/${jobId}/documents`)
  return { success: true }
}

const DOCUMENT_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order confirmation',
  receipt: 'Receipt',
}

/** Emails the exact PDF already stored at `blobUrl`, never a fresh render — the
 *  customer must receive byte-for-byte what the admin downloaded and reviewed. */
export async function emailDocument(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const documentId = String(formData.get('documentId') ?? '')
  if (!documentId) return { error: 'Missing document id.' }

  const [row] = await db
    .select()
    .from(jobDocuments)
    .innerJoin(jobs, eq(jobs.id, jobDocuments.jobId))
    .innerJoin(customers, eq(customers.id, jobs.customerId))
    .where(eq(jobDocuments.id, documentId))
  if (!row) return { error: 'Document not found.' }

  const email = row.customers.email
  if (!email) return { error: 'This customer has no email address on file.' }

  const pdfResponse = await fetch(row.job_documents.blobUrl)
  if (!pdfResponse.ok) return { error: 'Could not fetch the stored PDF.' }
  const pdf = Buffer.from(await pdfResponse.arrayBuffer())

  const label = DOCUMENT_LABELS[row.job_documents.kind] ?? 'Document'
  const { error } = await sendDocumentEmail({
    to: email,
    subject: `${label} ${row.job_documents.number} — Roomy Creations`,
    body: `Hi ${row.customers.name},\n\nPlease find attached your ${label.toLowerCase()} ${row.job_documents.number} from Roomy Creations.\n\nThank you for your business.`,
    filename: `${row.job_documents.number}.pdf`,
    pdf,
  })
  if (error) return { error }

  await db.update(jobDocuments).set({ sentTo: email, sentAt: new Date() }).where(eq(jobDocuments.id, documentId))

  revalidatePath(`/admin/jobs/${row.job_documents.jobId}/documents`)
  return { success: true }
}
