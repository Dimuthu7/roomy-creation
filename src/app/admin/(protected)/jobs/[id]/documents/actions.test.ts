import { describe, it, expect, vi, beforeEach } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { jobDocuments } from '@/db/schema'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
const blobDel = vi.fn().mockResolvedValue(undefined)
vi.mock('@vercel/blob', () => ({ put: vi.fn().mockResolvedValue({ url: 'https://blob.example/completion.pdf' }), del: (...args: unknown[]) => blobDel(...args) }))
vi.mock('@/pdf/CompletionDocument', () => ({ renderCompletionPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('@/pdf/OrderDocument', () => ({ renderOrderPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('@/pdf/QuotationDocument', () => ({ renderQuotationPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
const renderCompletionDocx = vi.fn().mockResolvedValue(Buffer.from('docx'))
const renderOrderDocx = vi.fn().mockResolvedValue(Buffer.from('docx'))
const renderQuotationDocx = vi.fn().mockResolvedValue(Buffer.from('docx'))
const renderReceiptDocx = vi.fn().mockResolvedValue(Buffer.from('docx'))
vi.mock('@/docx/CompletionDocument', () => ({ renderCompletionDocx }))
vi.mock('@/docx/OrderDocument', () => ({ renderOrderDocx }))
vi.mock('@/docx/QuotationDocument', () => ({ renderQuotationDocx }))
vi.mock('@/docx/ReceiptDocument', () => ({ renderReceiptDocx }))
vi.mock('@/lib/jobs/mail', () => ({ sendDocumentEmail: vi.fn().mockResolvedValue({}) }))

const buildCompletionSnapshot = vi.fn().mockReturnValue({ number: 'WC00001' })
vi.mock('@/lib/jobs/snapshot', () => ({
  buildCompletionSnapshot,
  buildOrderSnapshot: vi.fn(),
  buildQuotationSnapshot: vi.fn(),
}))

const loadJob = vi.fn()
const getJobBalance = vi.fn()
vi.mock('@/lib/jobs/queries', () => ({ loadJob, getJobBalance }))

const insertValues = vi.fn().mockResolvedValue(undefined)
const dbExecute = vi.fn()
const selectWhere = vi.fn().mockResolvedValue([])
const deleteWhere = vi.fn().mockResolvedValue(undefined)
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: (...args: unknown[]) => selectWhere(...args) })) })),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    execute: (...args: unknown[]) => dbExecute(...args),
  },
}))

function finishedJob(overrides: Record<string, unknown> = {}) {
  return {
    job: {
      id: 'job-1',
      ref: 'RC00188',
      stage: 'order',
      status: 'finished',
      quotationDate: '2026-03-21',
      confirmedAt: new Date('2026-04-02T00:00:00Z'),
      completedAt: new Date('2026-09-22T00:00:00Z'),
      salesPerson: 'ISHAN',
      discountLabel: 'Cash Discount',
      discountCents: 0,
      freeDelivery: false,
      deliveryChargeCents: null,
      ...overrides,
    },
    customer: { name: 'williams', phone: '+94 772383430', email: null, addressLines: null, city: null, district: null },
    units: [],
    terms: [],
    warranty: [],
  }
}

const RESOLVED_BALANCE = {
  totals: { subtotalCents: 300_000_00, discountCents: 0, totalCents: 300_000_00 },
  payments: [],
  position: { paidCents: 0, balanceCents: 300_000_00 },
}

beforeEach(() => {
  vi.clearAllMocks()
  dbExecute.mockResolvedValue({ rows: [{ value: 1 }] })
})

describe('generateCompletionDocument', () => {
  it('generates a certificate for a finished order', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.success).toBe(true)
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect(insertValues.mock.calls[0][0]).toMatchObject({ kind: 'completion', number: 'WC00001', jobId: 'job-1' })
  })

  it('numbers the certificate from the WC series rather than reusing the job ref', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await generateCompletionDocument({}, formData)

    // Asserted through the number handed to the snapshot builder, not by
    // stringifying the drizzle `sql` template — an SQL object's toString is an
    // implementation detail and makes for a test that breaks on an ORM upgrade.
    expect(dbExecute).toHaveBeenCalledTimes(1)
    expect(buildCompletionSnapshot.mock.calls[0][0].number).toBe('WC00001')
    expect(insertValues.mock.calls[0][0].number).not.toBe('RC00188')
  })

  it('refuses a job that has not been completed yet', async () => {
    loadJob.mockResolvedValue(finishedJob({ status: 'in_progress' }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses a job that is not an order', async () => {
    loadJob.mockResolvedValue(finishedJob({ stage: 'quotation' }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses when a unit is still unresolved, so no total exists', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue({ totals: null, payments: [], position: null })
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses a job whose status was set to finished directly (e.g. via the Status dropdown) without ever completing it', async () => {
    loadJob.mockResolvedValue(finishedJob({ completedAt: null }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('reports a missing counter row as a seedable problem rather than failing obscurely', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    dbExecute.mockResolvedValue({ rows: [] })
    const { generateCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await generateCompletionDocument({}, formData)

    expect(result.error).toContain('db:seed')
    expect(insertValues).not.toHaveBeenCalled()
  })
})

function pdfRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    jobId: 'job-1',
    kind: 'quotation',
    number: 'RC00188',
    format: 'pdf',
    blobUrl: 'https://blob.example/quotation.pdf',
    snapshot: { ref: 'RC00188' },
    paymentId: null,
    ...overrides,
  }
}

describe('generateWordDocument', () => {
  it('renders a Word sibling from the stored snapshot and inserts a new docx row', async () => {
    selectWhere.mockResolvedValue([pdfRow()])
    const { generateWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'doc-1')
    const result = await generateWordDocument({}, formData)

    expect(result.success).toBe(true)
    expect(renderQuotationDocx).toHaveBeenCalledWith({ ref: 'RC00188' })
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect(insertValues.mock.calls[0][0]).toMatchObject({
      jobId: 'job-1',
      kind: 'quotation',
      number: 'RC00188',
      format: 'docx',
    })
  })

  it('dispatches to the matching renderer for each document kind', async () => {
    selectWhere.mockResolvedValue([pdfRow({ id: 'doc-2', kind: 'completion', number: 'WC00001' })])
    const { generateWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'doc-2')
    await generateWordDocument({}, formData)

    expect(renderCompletionDocx).toHaveBeenCalled()
    expect(renderQuotationDocx).not.toHaveBeenCalled()
  })

  it('refuses when a Word version already exists for this row', async () => {
    selectWhere.mockResolvedValue([pdfRow({ format: 'docx' })])
    const { generateWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'doc-1')
    const result = await generateWordDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('reports a missing document rather than throwing', async () => {
    selectWhere.mockResolvedValue([])
    const { generateWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'missing')
    const result = await generateWordDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })
})

describe('deleteDocument', () => {
  it('deletes the blob and scopes the row delete by both id and jobId', async () => {
    selectWhere.mockResolvedValue([pdfRow()])
    const { deleteDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'doc-1')
    formData.set('jobId', 'job-1')
    await deleteDocument(formData)

    expect(blobDel).toHaveBeenCalledWith('https://blob.example/quotation.pdf')
    expect(deleteWhere).toHaveBeenCalledTimes(1)
    // Reconstructed from the real drizzle-orm builders, matching this file's other
    // scoping test — proves the delete cannot reach a row from a different job.
    expect(deleteWhere.mock.calls[0][0]).toEqual(and(eq(jobDocuments.id, 'doc-1'), eq(jobDocuments.jobId, 'job-1')))
  })

  it('still deletes the row when the blob is already gone', async () => {
    selectWhere.mockResolvedValue([pdfRow()])
    blobDel.mockRejectedValueOnce(new Error('not found'))
    const { deleteDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'doc-1')
    formData.set('jobId', 'job-1')
    await deleteDocument(formData)

    expect(deleteWhere).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when either id or jobId is missing', async () => {
    const { deleteDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'doc-1')
    // jobId deliberately omitted
    await deleteDocument(formData)

    expect(deleteWhere).not.toHaveBeenCalled()
  })

  it('is a no-op when no matching row exists for that job', async () => {
    selectWhere.mockResolvedValue([])
    const { deleteDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'doc-1')
    formData.set('jobId', 'job-1')
    await deleteDocument(formData)

    expect(blobDel).not.toHaveBeenCalled()
    expect(deleteWhere).not.toHaveBeenCalled()
  })
})
