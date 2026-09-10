'use server'
import { randomUUID } from 'crypto'
import { and, asc, eq, gt, lt, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { clauseLibrary } from '@/db/schema'
import { clauseFormSchema, CLAUSE_KINDS } from '@/lib/jobs/schema'

export interface ActionState {
  error?: string
  success?: boolean
}

function revalidateClauses() {
  revalidatePath('/admin/clauses')
}

export async function addClause(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const parsed = clauseFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // Appended to the end of its own kind's list. max+1 rather than count, so a list
  // with a deleted row in the middle cannot produce a duplicate position.
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${clauseLibrary.position}), -1) + 1` })
    .from(clauseLibrary)
    .where(eq(clauseLibrary.kind, parsed.data.kind))

  await db.insert(clauseLibrary).values({
    id: randomUUID(),
    kind: parsed.data.kind,
    body: parsed.data.body,
    emphasis: parsed.data.emphasis,
    position: next,
    active: true,
  })

  revalidateClauses()
  return { success: true }
}

export async function updateClause(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await verifyAdminSession()

  const id = formData.get('id')
  if (typeof id !== 'string' || id === '') return { error: 'Missing clause id.' }

  const parsed = clauseFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  await db
    .update(clauseLibrary)
    .set({ body: parsed.data.body, emphasis: parsed.data.emphasis, updatedAt: new Date() })
    .where(eq(clauseLibrary.id, id))

  revalidateClauses()
  return { success: true }
}

/** Plain (formData)-only signature, bound directly as a form action — there is no
 *  per-row pending/error UI to feed, matching testimonials/actions.ts's
 *  setTestimonialVisible/moveTestimonial convention. Hard delete is safe here because
 *  job_clauses holds copied text, not a reference — no past quotation loses a clause
 *  when the library entry goes. */
export async function deleteClause(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await db.delete(clauseLibrary).where(eq(clauseLibrary.id, id))

  revalidateClauses()
}

export async function toggleClauseActive(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await db
    .update(clauseLibrary)
    .set({ active: sql`not ${clauseLibrary.active}`, updatedAt: new Date() })
    .where(eq(clauseLibrary.id, id))

  revalidateClauses()
}

/** Swaps a clause with its neighbour in the same kind. Two updates rather than a
 *  renumber of the whole list, so concurrent edits touch as little as possible. */
export async function moveClause(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const direction = String(formData.get('direction') ?? '')
  if (!id || (direction !== 'up' && direction !== 'down')) return

  const [current] = await db.select().from(clauseLibrary).where(eq(clauseLibrary.id, id))
  if (!current) return

  const [neighbour] = await db
    .select()
    .from(clauseLibrary)
    .where(
      and(
        eq(clauseLibrary.kind, current.kind),
        direction === 'up'
          ? lt(clauseLibrary.position, current.position)
          : gt(clauseLibrary.position, current.position),
      ),
    )
    .orderBy(direction === 'up' ? sql`${clauseLibrary.position} desc` : asc(clauseLibrary.position))
    .limit(1)

  if (!neighbour) return // already at the end; not an error

  await db.update(clauseLibrary).set({ position: neighbour.position }).where(eq(clauseLibrary.id, current.id))
  await db.update(clauseLibrary).set({ position: current.position }).where(eq(clauseLibrary.id, neighbour.id))

  revalidateClauses()
}

export async function listClauses(kind: (typeof CLAUSE_KINDS)[number]) {
  return db.select().from(clauseLibrary).where(eq(clauseLibrary.kind, kind)).orderBy(asc(clauseLibrary.position))
}
