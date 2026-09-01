'use server'
import { randomUUID } from 'crypto'
import { and, asc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { verifyAdminSession } from '@/lib/adminAuth'
import { db } from '@/db/client'
import { testimonials } from '@/db/schema'
import { testimonialFormSchema } from '@/lib/testimonialSchema'
import { fetchFacebookReviews, mapFacebookReview } from '@/lib/facebookReviews'

export interface ActionState {
  error?: string
  success?: boolean
}

export interface SyncActionState {
  error?: string
  summary?: string
}

function revalidateTestimonials() {
  revalidatePath('/')
  revalidatePath('/admin/testimonials')
}

/** Pulls every review off the Page's Graph API ratings edge and upserts by
 *  fbReviewId — a re-sync refreshes content on existing rows without touching
 *  their admin-curated visible/position, and never auto-publishes a new one. */
export async function syncFacebookReviews(_prevState: SyncActionState): Promise<SyncActionState> {
  await verifyAdminSession()

  const pageId = process.env.FACEBOOK_PAGE_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !accessToken) {
    return {
      error: 'Facebook sync is not configured — set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN.',
    }
  }

  let raw
  try {
    raw = await fetchFacebookReviews({ pageId, accessToken })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Facebook sync failed.' }
  }

  const mapped = raw.map(mapFacebookReview).filter((r) => r !== null)
  if (mapped.length === 0) {
    return { summary: 'No reviews with text were found on Facebook.' }
  }

  const existing = await db
    .select({ fbReviewId: testimonials.fbReviewId })
    .from(testimonials)
    .where(eq(testimonials.source, 'facebook'))
  const existingIds = new Set(existing.map((r) => r.fbReviewId))

  await db
    .insert(testimonials)
    .values(
      mapped.map((review) => ({
        id: randomUUID(),
        source: 'facebook' as const,
        fbReviewId: review.fbReviewId,
        authorName: review.authorName,
        avatarUrl: review.avatarUrl,
        reviewText: review.reviewText,
        reviewUrl: review.reviewUrl,
        recommended: review.recommended,
        reviewedAt: review.reviewedAt,
        visible: false,
      })),
    )
    .onConflictDoUpdate({
      target: testimonials.fbReviewId,
      set: {
        authorName: sql`excluded.author_name`,
        avatarUrl: sql`excluded.avatar_url`,
        reviewText: sql`excluded.review_text`,
        reviewUrl: sql`excluded.review_url`,
        recommended: sql`excluded.recommended`,
        reviewedAt: sql`excluded.reviewed_at`,
        updatedAt: new Date(),
      },
    })

  const newCount = mapped.filter((r) => !existingIds.has(r.fbReviewId)).length
  const updatedCount = mapped.length - newCount

  revalidateTestimonials()
  return { summary: `${newCount} new, ${updatedCount} updated.` }
}

export async function addManualTestimonial(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifyAdminSession()

  const parsed = testimonialFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const data = parsed.data

  await db.insert(testimonials).values({
    id: randomUUID(),
    source: 'manual',
    authorName: data.authorName,
    reviewText: data.reviewText,
    rating: data.rating,
    recommended: data.recommended,
    visible: false,
  })

  revalidateTestimonials()
  return { success: true }
}

/** Showing a testimonial appends it to the end of the curated order; hiding one
 *  clears its position so a later re-sync or re-show starts fresh at the back,
 *  rather than resuming a stale slot. Plain (formData)-only signature: bound
 *  directly as a form action in the admin list, not through useActionState —
 *  there is no per-row pending/error UI to feed. */
export async function setTestimonialVisible(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const visible = formData.get('visible') === 'true'
  if (!id) return

  if (visible) {
    const [row] = await db
      .select({ max: sql<number | null>`max(${testimonials.position})` })
      .from(testimonials)
      .where(eq(testimonials.visible, true))
    const nextPosition = (row?.max ?? -1) + 1
    await db
      .update(testimonials)
      .set({ visible: true, position: nextPosition, updatedAt: new Date() })
      .where(eq(testimonials.id, id))
  } else {
    await db
      .update(testimonials)
      .set({ visible: false, position: null, updatedAt: new Date() })
      .where(eq(testimonials.id, id))
  }

  revalidateTestimonials()
}

/** Plain (formData)-only signature — see setTestimonialVisible's note. Up/Down
 *  buttons are disabled at the visible list's boundaries in the UI, so the
 *  out-of-range case below is a defensive no-op, not a surfaced error. */
export async function moveTestimonial(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  const direction = String(formData.get('direction') ?? '')
  if (!id || (direction !== 'up' && direction !== 'down')) return

  const visible = await db
    .select({ id: testimonials.id, position: testimonials.position })
    .from(testimonials)
    .where(eq(testimonials.visible, true))
    .orderBy(asc(testimonials.position))

  const index = visible.findIndex((row) => row.id === id)
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapIndex < 0 || swapIndex >= visible.length) return

  const current = visible[index]
  const swap = visible[swapIndex]
  await db
    .update(testimonials)
    .set({ position: swap.position, updatedAt: new Date() })
    .where(eq(testimonials.id, current.id))
  await db
    .update(testimonials)
    .set({ position: current.position, updatedAt: new Date() })
    .where(eq(testimonials.id, swap.id))

  revalidateTestimonials()
}

/** Plain (formData)-only signature — see setTestimonialVisible's note. */
export async function deleteManualTestimonial(formData: FormData): Promise<void> {
  await verifyAdminSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await db.delete(testimonials).where(and(eq(testimonials.id, id), eq(testimonials.source, 'manual')))

  revalidateTestimonials()
}
