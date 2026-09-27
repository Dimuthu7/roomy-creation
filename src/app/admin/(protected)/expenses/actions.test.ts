import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/adminAuth', () => ({ verifyAdminSession: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const resolveShopId = vi.hoisted(() => vi.fn())
vi.mock('@/lib/expenses/queries', () => ({ resolveShopId }))

const insertValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const deleteWhere = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('@/db/client', () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  },
}))

import { verifyAdminSession } from '@/lib/adminAuth'
import { addExpense, deleteExpense } from './actions'

function formData(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.append(key, value)
  return data
}

function materialForm(overrides: Record<string, string> = {}) {
  return formData({
    category: 'material',
    name: '18mm MDF board',
    description: '',
    price: '50,000.00',
    discount: '2,500.00',
    shopId: 'shop-1',
    spentAt: '2026-09-24',
    remark: '',
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveShopId.mockResolvedValue('shop-new')
})

describe('addExpense', () => {
  it('checks the admin session before doing anything', async () => {
    await addExpense({}, materialForm())
    expect(verifyAdminSession).toHaveBeenCalled()
  })

  it('inserts the net amount and the details blob', async () => {
    const result = await addExpense({}, materialForm())
    expect(result).toEqual({ success: true })
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'material',
        amountCents: 4_750_000,
        spentAt: '2026-09-24',
        remark: null,
        details: expect.objectContaining({ name: '18mm MDF board', shopId: 'shop-1' }),
      }),
    )
  })

  it('creates the shop when a new one was typed, and stores its id', async () => {
    await addExpense({}, materialForm({ shopId: '__new__', newShopName: 'Nawaloka Timber' }))
    expect(resolveShopId).toHaveBeenCalledWith('Nawaloka Timber')
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ details: expect.objectContaining({ shopId: 'shop-new' }) }),
    )
  })

  it('rejects a new shop with a blank name', async () => {
    const result = await addExpense({}, materialForm({ shopId: '__new__', newShopName: '   ' }))
    expect(result).toEqual({ error: 'Enter the new shop name.' })
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('does not touch the shops table for a category that has no shop', async () => {
    await addExpense({}, formData({ category: 'transport', amount: '3,500.00', spentAt: '2026-09-19', remark: '' }))
    expect(resolveShopId).not.toHaveBeenCalled()
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ category: 'transport', amountCents: 350_000 }))
  })

  it('returns the validation message and writes nothing when the discount exceeds the price', async () => {
    const result = await addExpense({}, materialForm({ price: '1,000.00', discount: '2,000.00' }))
    expect(result).toEqual({ error: 'Discount cannot be more than the price.' })
    expect(insertValues).not.toHaveBeenCalled()
  })

  it('fails closed on an unknown category', async () => {
    const result = await addExpense({}, formData({ category: 'crypto' }))
    expect(result).toEqual({ error: 'Unknown expense category.' })
    expect(insertValues).not.toHaveBeenCalled()
  })
})

describe('deleteExpense', () => {
  it('checks the admin session', async () => {
    await deleteExpense(formData({ id: 'expense-1' }))
    expect(verifyAdminSession).toHaveBeenCalled()
  })

  it('deletes the row', async () => {
    await deleteExpense(formData({ id: 'expense-1' }))
    expect(deleteWhere).toHaveBeenCalled()
  })

  it('does nothing without an id', async () => {
    await deleteExpense(formData({}))
    expect(deleteWhere).not.toHaveBeenCalled()
  })
})
