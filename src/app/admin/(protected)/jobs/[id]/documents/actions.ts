'use server'
import { randomUUID } from 'crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { deletePublicFile, uploadPublicFile } from '@/lib/storage'
import { DOCUMENT_MIME, MAX_DOCUMENT_BYTES, isDocumentKind, type DocumentFormat, type PrepareState } from '@/lib/jobs/documentFiles'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { customers, jobDocuments, jobs } from '@/db/schema'
import { getCompanyEmail } from '@/data/site'
import { getJobBalance, loadJob } from '@/lib/jobs/queries'
import { buildCompletionSnapshot, buildOrderSnapshot, buildQuotationSnapshot } from '@/lib/jobs/snapshot'
import { formatWarrantyNumber } from '@/lib/jobs/reference'
import { sendDocumentEmail } from '@/lib/jobs/mail'

export interface ActionState {
  error?: string
  success?: boolean
}

export async function listDocuments(jobId: string) {
  return db.select().from(jobDocuments).where(eq(jobDocuments.jobId, jobId)).orderBy(desc(jobDocuments.createdAt))
}

/** Best-effort blob cleanup, then the row — the row is the source of truth for what
 *  the documents list shows, so a stale or already-gone blob must never block removing
 *  it. Unlike every generator above, this is a real deletion, not an immutable
 *  snapshot: the admin is discarding a document, not superseding it with a new one. */
export async function deleteDocument(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const jobId = String(formData.get('jobId') ?? '')
  if (!id || !jobId) return

  const [row] = await db.select().from(jobDocuments).where(and(eq(jobDocuments.id, id), eq(jobDocuments.jobId, jobId)))
  if (!row) return

  try {
    await deletePublicFile(row.blobUrl)
  } catch {
    // The blob may already be gone — deleting the row is what the admin asked for.
  }

  await db.delete(jobDocuments).where(and(eq(jobDocuments.id, id), eq(jobDocuments.jobId, jobId)))

  revalidatePath(`/admin/jobs/${jobId}/documents`)
}

/** Step 1 of a new quotation PDF: validates and builds the snapshot the browser will
 *  draw. Nothing is stored yet — saveGeneratedDocument does that with the finished
 *  file, and always inserts a fresh row rather than updating one (see the spec's
 *  "Documents are immutable snapshots": editing the job afterwards must never rewrite a
 *  PDF a customer has already been sent). */
export async function prepareQuotationDocument(_prevState: PrepareState, formData: FormData): Promise<PrepareState> {
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
    companyEmail: await getCompanyEmail(),
  })

  return { prepared: { jobId, kind: 'quotation', number: loaded.job.ref, format: 'pdf', paymentId: null, snapshot } }
}

/** Refuses outside stage 'order' or while any unit is unresolved — the same
 *  invariant setJobStage enforces when confirming, checked again here because a
 *  document generator must never trust that the caller already checked. Reuses the
 *  job's own ref, never allocating a new number — see buildOrderSnapshot's doc
 *  comment. */
export async function prepareOrderDocument(_prevState: PrepareState, formData: FormData): Promise<PrepareState> {
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
    companyEmail: await getCompanyEmail(),
  })

  return { prepared: { jobId, kind: 'order', number: loaded.job.ref, format: 'pdf', paymentId: null, snapshot } }
}

/** The job's closing document. Refuses unless the job is actually finished — checked
 *  here and not merely hidden in the UI, per this area's rule that a generator never
 *  trusts its caller.
 *
 *  Unlike the order document, this allocates a number of its own from the WC series
 *  Slice 1 reserved for it: a warranty instrument is quoted by its own number years
 *  later, against a job reference the customer no longer remembers. Regenerating
 *  allocates a fresh number, the same way regenerating a receipt does — documents are
 *  immutable, so a reissue is a new document, never an edit. The number is taken here,
 *  in the prepare step, so one that never reaches saveGeneratedDocument (the browser
 *  failed to draw the file) leaves a gap in the series rather than reusing a number. */
export async function prepareCompletionDocument(_prevState: PrepareState, formData: FormData): Promise<PrepareState> {
  await verifyAdminSession()

  const jobId = String(formData.get('jobId') ?? '')
  if (!jobId) return { error: 'Missing job id.' }

  const loaded = await loadJob(jobId)
  if (!loaded) return { error: 'Quotation not found.' }
  if (loaded.job.stage !== 'order') return { error: 'Confirm this quotation as an order first.' }
  if (loaded.job.status !== 'finished') return { error: 'Complete this order before issuing the completion certificate.' }
  if (!loaded.job.completedAt) {
    return { error: 'Press Complete order on the job screen before issuing the certificate.' }
  }

  const balance = await getJobBalance(jobId)
  if (!balance || !balance.totals) {
    return { error: 'Every unit needs a chosen option before a completion certificate can be generated.' }
  }

  const counterRows = await db.execute<{ value: number }>(
    sql`update counters set value = value + 1 where key = 'warranty_card' returning value`,
  )
  const seq = Number(counterRows.rows[0]?.value)
  if (!Number.isInteger(seq)) {
    return { error: "Counter 'warranty_card' is missing — run npm run db:seed." }
  }

  const snapshot = buildCompletionSnapshot({
    number: formatWarrantyNumber(seq),
    ref: loaded.job.ref,
    quotationDate: loaded.job.quotationDate,
    confirmedDate: loaded.job.confirmedAt ? loaded.job.confirmedAt.toISOString().slice(0, 10) : loaded.job.quotationDate,
    completedDate: loaded.job.completedAt.toISOString().slice(0, 10),
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
    payments: balance.payments.map((p) => ({
      amountCents: p.amountCents,
      paidAt: p.paidAt,
      kind: p.kind as 'advance' | 'final' | 'other',
      method: p.method,
      note: p.note,
      createdAt: p.createdAt,
    })),
    terms: loaded.terms.map((c) => ({ body: c.body, emphasis: c.emphasis })),
    warranty: loaded.warranty.map((c) => ({ body: c.body, emphasis: c.emphasis })),
    companyEmail: await getCompanyEmail(),
  })

  return { prepared: { jobId, kind: 'completion', number: snapshot.number, format: 'pdf', paymentId: null, snapshot } }
}

/** Step 1 of an editable Word sibling of an already-generated PDF document. Hands the
 *  browser the PDF's own stored `snapshot` rather than recomputing one, so it never
 *  re-runs the business rules (or side effects, like the completion certificate's
 *  warranty-number allocation) that produced the original — regenerating those belongs
 *  to the PDF generators above, not to a format conversion. Immutable like every other
 *  document row: saveGeneratedDocument always inserts a new row, never edits the PDF
 *  row this was prepared from. */
export async function prepareWordDocument(_prevState: PrepareState, formData: FormData): Promise<PrepareState> {
  await verifyAdminSession()

  const documentId = String(formData.get('documentId') ?? '')
  if (!documentId) return { error: 'Missing document id.' }

  const [row] = await db.select().from(jobDocuments).where(eq(jobDocuments.id, documentId))
  if (!row) return { error: 'Document not found.' }
  if (row.format !== 'pdf') return { error: 'A Word version already exists for this document.' }
  if (!isDocumentKind(row.kind)) return { error: `Word export is not available for ${row.kind} documents.` }

  return {
    prepared: { jobId: row.jobId, kind: row.kind, number: row.number, format: 'docx', paymentId: row.paymentId, snapshot: row.snapshot },
  }
}

/** Step 2 of every document: stores the file the browser drew and records it. The
 *  snapshot comes back from the browser along with the file, so this trusts the
 *  signed-in admin for what the document says — the same trust the admin already has
 *  to edit the job itself. */
export async function saveGeneratedDocument(formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const file = formData.get('file')
  const jobId = String(formData.get('jobId') ?? '')
  const kind = String(formData.get('kind') ?? '')
  const number = String(formData.get('number') ?? '')
  const format = String(formData.get('format') ?? '')
  const paymentId = String(formData.get('paymentId') ?? '') || null
  const snapshotJson = String(formData.get('snapshot') ?? '')

  if (!(file instanceof File) || !jobId || !number || !snapshotJson) return { error: 'Missing document data.' }
  if (!isDocumentKind(kind)) return { error: 'Unknown document type.' }
  if (format !== 'pdf' && format !== 'docx') return { error: 'Unknown document format.' }
  if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES) return { error: 'The generated file is empty or too large.' }

  let snapshot: unknown
  try {
    snapshot = JSON.parse(snapshotJson)
  } catch {
    return { error: 'Missing document data.' }
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId))
  if (!job) return { error: 'Quotation not found.' }

  const documentFormat: DocumentFormat = format
  const blob = await uploadPublicFile(
    `${kind}s/${number}-${Date.now()}.${documentFormat}`,
    new Blob([await file.arrayBuffer()], { type: DOCUMENT_MIME[documentFormat] }),
  )

  await db.insert(jobDocuments).values({
    id: randomUUID(),
    jobId,
    kind,
    number,
    format: documentFormat,
    blobUrl: blob.url,
    snapshot,
    paymentId,
  })

  revalidatePath(`/admin/jobs/${jobId}/documents`)
  revalidatePath(`/admin/jobs/${jobId}/payments`)
  return { success: true }
}

const DOCUMENT_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order confirmation',
  receipt: 'Receipt',
  completion: 'Completion certificate',
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

  const fileResponse = await fetch(row.job_documents.blobUrl)
  if (!fileResponse.ok) return { error: 'Could not fetch the stored document.' }
  const pdf = Buffer.from(await fileResponse.arrayBuffer())

  const label = DOCUMENT_LABELS[row.job_documents.kind] ?? 'Document'
  const extension = row.job_documents.format === 'docx' ? 'docx' : 'pdf'
  const { error } = await sendDocumentEmail({
    to: email,
    subject: `${label} ${row.job_documents.number} — Roomy Creations`,
    body: `Hi ${row.customers.name},\n\nPlease find attached your ${label.toLowerCase()} ${row.job_documents.number} from Roomy Creations.\n\nThank you for your business.`,
    filename: `${row.job_documents.number}.${extension}`,
    pdf,
  })
  if (error) return { error }

  await db.update(jobDocuments).set({ sentTo: email, sentAt: new Date() }).where(eq(jobDocuments.id, documentId))

  revalidatePath(`/admin/jobs/${row.job_documents.jobId}/documents`)
  return { success: true }
}
