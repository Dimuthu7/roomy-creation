'use server'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { expenses } from '@/db/schema'
import { NEW_SHOP_VALUE } from '@/lib/expenses/categories'
import { resolveShopId } from '@/lib/expenses/queries'
import { parseExpenseForm } from '@/lib/expenses/schema'

export interface ActionState {
  error?: string
  success?: boolean
}

export async function addExpense(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const raw = Object.fromEntries(formData) as Record<string, unknown>
  const category = raw.category

  // The shop is resolved BEFORE validation, so the schema only ever sees a real id and
  // needs no knowledge of the "__new__" sentinel. Keeping that sentinel out of the
  // schema is what lets a future dropdown-backed field reuse the same pattern.
  if (raw.shopId === NEW_SHOP_VALUE) {
    const name = typeof raw.newShopName === 'string' ? raw.newShopName.trim() : ''
    if (name === '') return { error: 'Enter the new shop name.' }
    try {
      raw.shopId = await resolveShopId(name)
    } catch {
      return { error: 'Could not save that shop.' }
    }
  }

  const parsed = parseExpenseForm(category, raw)
  if (!parsed.ok) return { error: parsed.error }

  await db.insert(expenses).values({
    id: randomUUID(),
    category: parsed.value.category,
    amountCents: parsed.value.amountCents,
    spentAt: parsed.value.spentAt,
    remark: parsed.value.remark,
    details: parsed.value.details,
  })

  revalidatePath('/admin/expenses')
  return { success: true }
}

/** Plain (formData)-only signature, bound directly as a form action — there is no
 *  per-row pending/error UI to feed, matching deleteClause. Hard delete: an expense
 *  row is referenced by nothing. */
export async function deleteExpense(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await db.delete(expenses).where(eq(expenses.id, id))

  revalidatePath('/admin/expenses')
}
