import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const loadJob = vi.fn()
vi.mock('@/lib/jobs/queries', () => ({ loadJob, allocateRef: vi.fn() }))

const updateSet = vi.fn()
const updateWhere = vi.fn().mockResolvedValue(undefined)
vi.mock('@/db/client', () => ({
  db: {
    update: vi.fn(() => ({ set: (...args: unknown[]) => { updateSet(...args); return { where: updateWhere } } })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    select: vi.fn(),
  },
}))

/** A job whose single unit has one option: jobTotals resolves, so completion is
 *  allowed on every axis except the one each test deliberately breaks. */
function completableJob(overrides: Record<string, unknown> = {}) {
  return {
    job: {
      id: 'job-1',
      stage: 'order',
      status: 'in_progress',
      discountCents: 0,
      freeDelivery: false,
      deliveryChargeCents: null,
      ...overrides,
    },
    units: [{ title: 'Unit 01', options: [{ label: null, priceCents: 100_000_00, qty: 1, selected: true, specs: [] }] }],
    customer: {},
    terms: [],
    warranty: [],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('completeJob', () => {
  it('sets status to finished and stamps completedAt', async () => {
    loadJob.mockResolvedValue(completableJob())
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).toHaveBeenCalledTimes(1)
    const patch = updateSet.mock.calls[0][0]
    expect(patch.status).toBe('finished')
    expect(patch.completedAt).toBeInstanceOf(Date)
  })

  it('never touches stage or updatedAt — completion is a transition, not a content edit, and bumping updatedAt would falsely mark every issued document stale', async () => {
    loadJob.mockResolvedValue(completableJob())
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    const patch = updateSet.mock.calls[0][0]
    expect(patch).not.toHaveProperty('stage')
    expect(patch).not.toHaveProperty('updatedAt')
  })

  it('refuses a job still in the quotation stage', async () => {
    loadJob.mockResolvedValue(completableJob({ stage: 'quotation' }))
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses a cancelled job — that is abandoned, not completed', async () => {
    loadJob.mockResolvedValue(completableJob({ status: 'cancelled' }))
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses a job with an unresolved unit, the same invariant confirming enforces', async () => {
    const unresolved = completableJob()
    unresolved.units = [
      {
        title: 'Unit 01',
        options: [
          { label: null, priceCents: 100_00, qty: 1, selected: false, specs: [] },
          { label: null, priceCents: 200_00, qty: 1, selected: false, specs: [] },
        ],
      },
    ]
    loadJob.mockResolvedValue(unresolved)
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses a missing job', async () => {
    loadJob.mockResolvedValue(null)
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    expect(updateSet).not.toHaveBeenCalled()
  })

  it('refuses with no id, without touching the database', async () => {
    const { completeJob } = await import('./actions')

    await completeJob(new FormData())

    expect(loadJob).not.toHaveBeenCalled()
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('completes even with an outstanding balance — the balance warns in the UI, it never gates the action', async () => {
    loadJob.mockResolvedValue(completableJob())
    const { completeJob } = await import('./actions')

    const formData = new FormData()
    formData.set('id', 'job-1')
    await completeJob(formData)

    // No payment data was provided to the action at all, which is the point: it does
    // not read the balance, so it cannot be blocked by one.
    expect(updateSet).toHaveBeenCalledTimes(1)
  })
})
