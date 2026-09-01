import 'server-only'
import { unstable_cache } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { testimonials } from '@/db/schema'

export type TestimonialSource = 'facebook' | 'manual'

export interface Testimonial {
  id: string
  authorName: string
  avatarUrl: string | null
  reviewText: string
  reviewUrl: string | null
  recommended: boolean | null
  rating: number | null
  source: TestimonialSource
}

/** Admin curation view — every row regardless of visibility, plus the fields only
 *  the admin list needs (visible/position, and fbReviewId to tell FB-sourced rows
 *  apart from manual ones for the delete-vs-hide-only rule). */
export interface AdminTestimonial extends Testimonial {
  fbReviewId: string | null
  visible: boolean
  position: number | null
}

type TestimonialRow = typeof testimonials.$inferSelect

function toTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    authorName: row.authorName,
    avatarUrl: row.avatarUrl,
    reviewText: row.reviewText,
    reviewUrl: row.reviewUrl,
    recommended: row.recommended,
    rating: row.rating,
    source: row.source as TestimonialSource,
  }
}

function toAdminTestimonial(row: TestimonialRow): AdminTestimonial {
  return {
    ...toTestimonial(row),
    fbReviewId: row.fbReviewId,
    visible: row.visible,
    position: row.position,
  }
}

// What the site actually displays: only admin-approved rows, in curated order.
const fetchVisibleTestimonials = unstable_cache(
  async () => {
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.visible, true))
      .orderBy(asc(testimonials.position))
  },
  ['testimonials-visible'],
)

/** Visible testimonials, in curated display order — for public use. */
export async function getTestimonials(): Promise<Testimonial[]> {
  const rows = await fetchVisibleTestimonials()
  return rows.map(toTestimonial)
}

/** Every testimonial (Facebook-synced and manual, visible or not) for admin curation. */
export async function getAllTestimonials(): Promise<AdminTestimonial[]> {
  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.createdAt))
  return rows.map(toAdminTestimonial)
}
