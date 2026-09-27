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

  // The new shop is only a candidate here — nothing is written to the shops table yet.
  // Writing it before the rest of the form validates would leave an orphaned shop row
  // behind (with no shop-management screen to clean it up) whenever some other field
  // then fails validation. `raw.shopId` gets a harmless placeholder so the schema,
  // which only checks it's non-empty, can validate every other field normally.
  const isNewShop = raw.shopId === NEW_SHOP_VALUE
  let newShopName = ''
  if (isNewShop) {
    newShopName = typeof raw.newShopName === 'string' ? raw.newShopName.trim() : ''
    if (newShopName === '') return { error: 'Enter the new shop name.' }
    if (newShopName.length > 120) return { error: 'Use 120 characters or fewer for the shop name.' }
    raw.shopId = 'pending-new-shop'
  }

  const parsed = parseExpenseForm(category, raw)
  if (!parsed.ok) return { error: parsed.error }

  // Only now, after every other field has validated, does the new shop actually get
  // written — so a failed submission never leaves a shop behind that nothing points to.
  if (isNewShop) {
    try {
      parsed.value.details.shopId = await resolveShopId(newShopName)
    } catch {
      return { error: 'Could not save that shop.' }
    }
  }

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
