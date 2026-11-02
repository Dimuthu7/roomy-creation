import { describe, it, expect, vi, beforeEach } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { jobDocuments } from '@/db/schema'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
const blobDel = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/storage', () => ({ uploadPublicFile: vi.fn().mockResolvedValue({ url: 'https://blob.example/completion.pdf' }), deletePublicFile: (...args: unknown[]) => blobDel(...args) }))
vi.mock('@/lib/jobs/mail', () => ({ sendDocumentEmail: vi.fn().mockResolvedValue({}) }))

const buildCompletionSnapshot = vi.fn().mockReturnValue({ number: 'WC00001' })
const buildOrderSnapshot = vi.fn()
const buildQuotationSnapshot = vi.fn()
vi.mock('@/lib/jobs/snapshot', () => ({
  buildCompletionSnapshot,
  buildOrderSnapshot,
  buildQuotationSnapshot,
}))

const loadJob = vi.fn()
const getJobBalance = vi.fn()
vi.mock('@/lib/jobs/queries', () => ({ loadJob, getJobBalance }))

// Defaults to a configured email; individual tests override with null to check the
// omit-rather-than-hardcode behaviour.
const getCompanyEmail = vi.fn().mockResolvedValue('roomycreation@gmail.com')
vi.mock('@/data/site', () => ({ getCompanyEmail: (...args: unknown[]) => getCompanyEmail(...args) }))

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

function finishedJob(overrides: Record<string, unknown> = {}, units: unknown[] = []) {
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
    units,
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

const ONE_UNIT = [{ id: 'u1', title: 'Unit 01', options: [{ id: 'o1', label: null, priceCents: 100_000_00, qty: 1, selected: true, specs: [] }] }]

describe('prepareQuotationDocument', () => {
  it('uses the site-configured email for the masthead rather than a hardcoded one', async () => {
    loadJob.mockResolvedValue(finishedJob({ stage: 'quotation' }, ONE_UNIT))
    getCompanyEmail.mockResolvedValue('contact@roomycreations.lk')
    const { prepareQuotationDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await prepareQuotationDocument({}, formData)

    expect(buildQuotationSnapshot.mock.calls[0][0].companyEmail).toBe('contact@roomycreations.lk')
  })

  it('passes no company email when the site has none configured', async () => {
    loadJob.mockResolvedValue(finishedJob({ stage: 'quotation' }, ONE_UNIT))
    getCompanyEmail.mockResolvedValue(null)
    const { prepareQuotationDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await prepareQuotationDocument({}, formData)

    expect(buildQuotationSnapshot.mock.calls[0][0].companyEmail).toBeNull()
  })
})

describe('prepareOrderDocument', () => {
  it('uses the site-configured email for the masthead rather than a hardcoded one', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    getCompanyEmail.mockResolvedValue('contact@roomycreations.lk')
    const { prepareOrderDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await prepareOrderDocument({}, formData)

    expect(buildOrderSnapshot.mock.calls[0][0].companyEmail).toBe('contact@roomycreations.lk')
  })
})

describe('prepareCompletionDocument', () => {
  it('generates a certificate for a finished order', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await prepareCompletionDocument({}, formData)

    expect(result.error).toBeUndefined()
    expect(result.prepared).toMatchObject({ kind: 'completion', number: 'WC00001', jobId: 'job-1', format: 'pdf', paymentId: null })
    // Preparing stores nothing: the row is written only once the browser hands back a file.
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('numbers the certificate from the WC series rather than reusing the job ref', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await prepareCompletionDocument({}, formData)

    // Asserted through the number handed to the snapshot builder, not by
    // stringifying the drizzle `sql` template — an SQL object's toString is an
    // implementation detail and makes for a test that breaks on an ORM upgrade.
    expect(dbExecute).toHaveBeenCalledTimes(1)
    expect(buildCompletionSnapshot.mock.calls[0][0].number).toBe('WC00001')
    expect(buildCompletionSnapshot.mock.calls[0][0].number).not.toBe('RC00188')
  })

  it('refuses a job that has not been completed yet', async () => {
    loadJob.mockResolvedValue(finishedJob({ status: 'in_progress' }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await prepareCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses a job that is not an order', async () => {
    loadJob.mockResolvedValue(finishedJob({ stage: 'quotation' }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await prepareCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses when a unit is still unresolved, so no total exists', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue({ totals: null, payments: [], position: null })
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await prepareCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses a job whose status was set to finished directly (e.g. via the Status dropdown) without ever completing it', async () => {
    loadJob.mockResolvedValue(finishedJob({ completedAt: null }))
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await prepareCompletionDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('reports a missing counter row as a seedable problem rather than failing obscurely', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    dbExecute.mockResolvedValue({ rows: [] })
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    const result = await prepareCompletionDocument({}, formData)

    expect(result.error).toContain('db:seed')
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('uses the site-configured email for the masthead rather than a hardcoded one', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    getCompanyEmail.mockResolvedValue('contact@roomycreations.lk')
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await prepareCompletionDocument({}, formData)

    expect(buildCompletionSnapshot.mock.calls[0][0].companyEmail).toBe('contact@roomycreations.lk')
  })

  it('passes no company email when the site has none configured, rather than a placeholder', async () => {
    loadJob.mockResolvedValue(finishedJob())
    getJobBalance.mockResolvedValue(RESOLVED_BALANCE)
    getCompanyEmail.mockResolvedValue(null)
    const { prepareCompletionDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    await prepareCompletionDocument({}, formData)

    expect(buildCompletionSnapshot.mock.calls[0][0].companyEmail).toBeNull()
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

describe('prepareWordDocument', () => {
  it('hands the browser the PDF row\'s stored snapshot to draw a Word sibling from', async () => {
    selectWhere.mockResolvedValue([pdfRow()])
    const { prepareWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'doc-1')
    const result = await prepareWordDocument({}, formData)

    expect(result.prepared).toEqual({
      jobId: 'job-1',
      kind: 'quotation',
      number: 'RC00188',
      format: 'docx',
      paymentId: null,
      snapshot: { ref: 'RC00188' },
    })
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('carries the kind through for each document type', async () => {
    selectWhere.mockResolvedValue([pdfRow({ id: 'doc-2', kind: 'completion', number: 'WC00001' })])
    const { prepareWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'doc-2')
    const result = await prepareWordDocument({}, formData)

    expect(result.prepared).toMatchObject({ kind: 'completion', number: 'WC00001' })
  })

  it('refuses when a Word version already exists for this row', async () => {
    selectWhere.mockResolvedValue([pdfRow({ format: 'docx' })])
    const { prepareWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'doc-1')
    const result = await prepareWordDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(result.prepared).toBeUndefined()
  })

  it('reports a missing document rather than throwing', async () => {
    selectWhere.mockResolvedValue([])
    const { prepareWordDocument } = await import('./actions')

    const formData = new FormData()
    formData.set('documentId', 'missing')
    const result = await prepareWordDocument({}, formData)

    expect(result.error).toBeTruthy()
    expect(result.prepared).toBeUndefined()
  })
})

function savedFormData(overrides: Record<string, string | File> = {}) {
  const formData = new FormData()
  const fields: Record<string, string | File> = {
    file: new File(['%PDF-1.4'], 'RC00188.pdf', { type: 'application/pdf' }),
    jobId: 'job-1',
    kind: 'quotation',
    number: 'RC00188',
    format: 'pdf',
    paymentId: '',
    snapshot: JSON.stringify({ ref: 'RC00188' }),
    ...overrides,
  }
  for (const [name, value] of Object.entries(fields)) formData.set(name, value)
  return formData
}

describe('saveGeneratedDocument', () => {
  it('stores the browser-drawn file and inserts a new immutable row', async () => {
    selectWhere.mockResolvedValue([{ id: 'job-1' }])
    const { saveGeneratedDocument } = await import('./actions')
    const { uploadPublicFile } = await import('@/lib/storage')

    const result = await saveGeneratedDocument(savedFormData())

    expect(result.success).toBe(true)
    expect(uploadPublicFile).toHaveBeenCalledWith(expect.stringMatching(/^quotations\/RC00188-\d+\.pdf$/), expect.any(Blob))
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect(insertValues.mock.calls[0][0]).toMatchObject({
      jobId: 'job-1',
      kind: 'quotation',
      number: 'RC00188',
      format: 'pdf',
      snapshot: { ref: 'RC00188' },
      paymentId: null,
    })
  })

  it('records a Word file and the payment a receipt belongs to', async () => {
    selectWhere.mockResolvedValue([{ id: 'job-1' }])
    const { saveGeneratedDocument } = await import('./actions')

    const result = await saveGeneratedDocument(
      savedFormData({ kind: 'receipt', number: 'RCP00001', format: 'docx', paymentId: 'pay-1', file: new File(['PK'], 'x.docx') }),
    )

    expect(result.success).toBe(true)
    expect(insertValues.mock.calls[0][0]).toMatchObject({ kind: 'receipt', format: 'docx', paymentId: 'pay-1' })
  })

  it.each([
    ['an unknown document type', { kind: 'invoice' }],
    ['an unknown format', { format: 'exe' }],
    ['a missing snapshot', { snapshot: '' }],
    ['a snapshot that is not JSON', { snapshot: '{oops' }],
    ['an empty file', { file: new File([], 'x.pdf') }],
    ['a missing job id', { jobId: '' }],
  ])('refuses %s without storing anything', async (_label, overrides) => {
    selectWhere.mockResolvedValue([{ id: 'job-1' }])
    const { saveGeneratedDocument } = await import('./actions')
    const { uploadPublicFile } = await import('@/lib/storage')

    const result = await saveGeneratedDocument(savedFormData(overrides as Record<string, string | File>))

    expect(result.error).toBeTruthy()
    expect(uploadPublicFile).not.toHaveBeenCalled()
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('refuses a file for a job that does not exist', async () => {
    selectWhere.mockResolvedValue([])
    const { saveGeneratedDocument } = await import('./actions')
    const { uploadPublicFile } = await import('@/lib/storage')

    const result = await saveGeneratedDocument(savedFormData())

    expect(result.error).toBeTruthy()
    expect(uploadPublicFile).not.toHaveBeenCalled()
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
