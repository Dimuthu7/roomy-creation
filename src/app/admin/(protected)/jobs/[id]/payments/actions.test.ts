import { describe, it, expect, vi, beforeEach } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { payments } from '@/db/schema'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn().mockResolvedValue({ url: 'https://blob.example/receipt.pdf' }) }))
vi.mock('@/pdf/ReceiptDocument', () => ({ renderReceiptPdf: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))

const buildReceiptSnapshot = vi.fn().mockReturnValue({ number: 'RCP00001' })
vi.mock('@/lib/jobs/snapshot', () => ({ buildReceiptSnapshot }))

const getJobBalance = vi.fn()
vi.mock('@/lib/jobs/queries', () => ({ getJobBalance }))

// A minimal chainable, thenable stand-in for drizzle's fluent query builder: every
// chain method returns itself, and awaiting the chain resolves to the fixed `rows`
// it was built with — exactly what `await db.select()...` needs.
function chain(rows: unknown) {
  const obj = {
    from: vi.fn(() => obj),
    innerJoin: vi.fn(() => obj),
    where: vi.fn(() => obj),
    orderBy: vi.fn(() => obj),
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => Promise.resolve(rows).then(resolve, reject),
  }
  return obj
}

const deleteWhere = vi.fn().mockResolvedValue(undefined)
const insertValues = vi.fn().mockResolvedValue(undefined)
const dbSelect = vi.fn()
const dbExecute = vi.fn()

vi.mock('@/db/client', () => ({
  db: {
    select: (...args: unknown[]) => dbSelect(...args),
    delete: vi.fn(() => ({ where: deleteWhere })),
    insert: vi.fn(() => ({ values: insertValues })),
    execute: (...args: unknown[]) => dbExecute(...args),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deletePayment', () => {
  it('scopes the delete by both payment id and jobId, matching generateReceipt\'s job-scoping pattern', async () => {
    const { deletePayment } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'payment-1')
    formData.set('jobId', 'job-1')
    await deletePayment(formData)

    expect(deleteWhere).toHaveBeenCalledTimes(1)
    // Reconstruct the expected condition from the real drizzle-orm builders and
    // compare structurally — proves the where clause actually scopes by jobId, not
    // just that *some* condition was passed. A row belonging to a different job can
    // no longer be deleted by guessing its payment id.
    expect(deleteWhere.mock.calls[0][0]).toEqual(and(eq(payments.id, 'payment-1'), eq(payments.jobId, 'job-1')))
  })

  it('is a no-op (does nothing) when either id or jobId is missing', async () => {
    const { deletePayment } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'payment-1')
    // jobId deliberately omitted
    await deletePayment(formData)

    expect(deleteWhere).not.toHaveBeenCalled()
  })
})

describe('generateReceipt', () => {
  it('uses the full current payment list for the balance, not a historical subset frozen at the receipted payment\'s own time', async () => {
    const olderPayment = {
      id: 'p1',
      jobId: 'job-1',
      kind: 'advance',
      amountCents: 100_000_00,
      paidAt: '2026-01-01',
      method: null,
      note: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const newerPayment = {
      id: 'p2',
      jobId: 'job-1',
      kind: 'final',
      amountCents: 200_000_00,
      paidAt: '2026-02-01',
      method: null,
      note: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
    }
    // getJobBalance's payments — the current full list, in listPayments' desc order.
    const currentBalance = {
      totals: { subtotalCents: 300_000_00, discountCents: 0, totalCents: 300_000_00 },
      payments: [newerPayment, olderPayment],
      position: { paidCents: 300_000_00, balanceCents: 0 },
    }
    getJobBalance.mockResolvedValue(currentBalance)

    dbSelect
      .mockImplementationOnce(() => chain([{ jobs: { ref: 'RC00001' }, customers: { name: 'Test Customer' } }]))
      .mockImplementationOnce(() => chain([newerPayment, olderPayment]))
    dbExecute.mockResolvedValue({ rows: [{ value: 1 }] })

    const { generateReceipt } = await import('./actions')

    const formData = new FormData()
    formData.set('jobId', 'job-1')
    // Receipting the OLDER payment: the old (buggy) behaviour filtered
    // `paymentsIncludingThis` to createdAt <= this payment's createdAt, which would
    // have excluded `newerPayment`. The spec calls for the full current list instead.
    formData.set('paymentId', 'p1')

    const result = await generateReceipt({}, formData)

    expect(result.success).toBe(true)
    expect(buildReceiptSnapshot).toHaveBeenCalledTimes(1)
    const call = buildReceiptSnapshot.mock.calls[0][0]
    expect(call.paymentsIncludingThis).toBe(currentBalance.payments)
    expect(call.paymentsIncludingThis).toEqual([newerPayment, olderPayment])
  })
})
