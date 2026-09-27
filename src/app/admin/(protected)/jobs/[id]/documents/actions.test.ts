import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn().mockResolvedValue({ url: 'https://blob.example/completion.pdf' }) }))
vi.mock('@/pdf/CompletionDocument', () => ({ renderCompletionPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('@/pdf/OrderDocument', () => ({ renderOrderPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
vi.mock('@/pdf/QuotationDocument', () => ({ renderQuotationPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))
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
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
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
