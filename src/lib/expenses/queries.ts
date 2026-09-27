import 'server-only'
import { randomUUID } from 'crypto'
import { and, asc, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm'
import { db } from '@/db/client'
import { expenses, shops } from '@/db/schema'
import { isExpenseCategory } from './categories'
import { monthRange } from './month'

export const EXPENSES_PAGE_SIZE = 10

export interface ExpenseListFilters {
  /** 'YYYY-MM'. An unparseable or absent month means no date bound at all. */
  month?: string
  category?: string
  /** 1-based. Defaults to 1. */
  page?: number
}

/** Shared by the list and the breakdown, so the two can never disagree about which
 *  rows they are describing. */
function buildWhere(filters: ExpenseListFilters) {
  const conditions = []

  const range = filters.month ? monthRange(filters.month) : null
  if (range) {
    conditions.push(gte(expenses.spentAt, range.start))
    conditions.push(lte(expenses.spentAt, range.end))
  }
  if (isExpenseCategory(filters.category)) {
    conditions.push(eq(expenses.category, filters.category))
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

export async function listExpenses(filters: ExpenseListFilters = {}) {
  const where = buildWhere(filters)
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(where)
      // Two keys: spent_at is what the admin cares about, created_at breaks ties so
      // two expenses entered on the same date keep a stable, repeatable order across
      // pages instead of drifting between queries.
      .orderBy(desc(expenses.spentAt), desc(expenses.createdAt))
      .limit(EXPENSES_PAGE_SIZE)
      .offset((page - 1) * EXPENSES_PAGE_SIZE),
    db.select({ total: count() }).from(expenses).where(where),
  ])

  return { rows, page, total, totalPages: Math.max(1, Math.ceil(total / EXPENSES_PAGE_SIZE)) }
}

/** Totals across the WHOLE filtered period, not just the current page — the
 *  breakdown describes the month, not the ten rows on screen. */
export async function monthCategoryTotals(filters: ExpenseListFilters = {}) {
  const rows = await db
    .select({ category: expenses.category, totalCents: sum(expenses.amountCents) })
    .from(expenses)
    .where(buildWhere(filters))
    .groupBy(expenses.category)

  // sum() comes back as a string (or null for an empty group) because Postgres widens
  // it to numeric — Number() here, not in the pure totals module, keeps that database
  // quirk at the database boundary.
  return rows.map((row) => ({ category: row.category, totalCents: Number(row.totalCents ?? 0) }))
}

export async function listShops() {
  return db.select({ id: shops.id, name: shops.name }).from(shops).orderBy(asc(shops.name))
}

/** Returns the id of the shop with this name, creating it if it is new. Matching is
 *  case-insensitive, mirroring the unique index. */
export async function resolveShopId(name: string): Promise<string> {
  const trimmed = name.trim()

  const [existing] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(sql`lower(${shops.name}) = lower(${trimmed})`)
    .limit(1)
  if (existing) return existing.id

  const id = randomUUID()
  try {
    await db.insert(shops).values({ id, name: trimmed })
    return id
  } catch {
    // Two admins adding the same new shop at the same moment: the unique index rejects
    // the loser, whose correct answer is the row the winner just wrote, not an error.
    const [raced] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(sql`lower(${shops.name}) = lower(${trimmed})`)
      .limit(1)
    if (raced) return raced.id
    throw new Error('Could not save that shop.')
  }
}
