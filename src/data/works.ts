import 'server-only'
import { unstable_cache } from 'next/cache'
import { asc, isNotNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { works } from '@/db/schema'
import { TBC, type Maybe } from '@/lib/tbc'
import { RATIOS, type PropertyType, type Ratio, type Work, type WorkSlot } from './workTypes'
import type { WorkCategoryId } from './categories'

export { RATIOS, type Ratio, type PropertyType, type Work, type WorkSlot }

function orTBC<T>(value: T | null): Maybe<T> {
  return value === null ? TBC : value
}

type WorkRow = typeof works.$inferSelect

function toWorkSlot(row: WorkRow): WorkSlot {
  return {
    id: row.id,
    category: row.category as WorkCategoryId,
    ratio: row.ratio as Ratio,
    image: row.image,
    beforeImage: row.beforeImage,
    title: row.title,
    materials: orTBC(row.materials),
    dimensions: orTBC(row.dimensions),
    hardware: orTBC(row.hardware),
    propertyType: orTBC(row.propertyType as PropertyType | null),
    district: orTBC(row.district),
    year: orTBC(row.year),
  }
}

function toWork(row: WorkRow): Work {
  return {
    id: row.id,
    category: row.category as WorkCategoryId,
    ratio: row.ratio as Ratio,
    image: row.image as string,
    ...(row.beforeImage ? { beforeImage: row.beforeImage } : {}),
    title: row.title,
    materials: orTBC(row.materials),
    dimensions: orTBC(row.dimensions),
    hardware: orTBC(row.hardware),
    propertyType: orTBC(row.propertyType as PropertyType | null),
    district: orTBC(row.district),
    year: orTBC(row.year),
  }
}

// The full planned catalog — every slot the client is expected to eventually
// supply a photo for, regardless of whether that photo has arrived yet.
const fetchAllWorks = unstable_cache(
  async () => {
    const rows = await db.select().from(works).orderBy(asc(works.position))
    return rows
  },
  ['works-all']
)

/** Every planned gallery slot, including ones with no photo uploaded yet — for admin
 *  use. Unlike getWorks(), a slot's `image` may be null. */
export async function getAllWorks(): Promise<WorkSlot[]> {
  const rows = await fetchAllWorks()
  return rows.map(toWorkSlot)
}

// What the site actually displays: only the slots with a real photo uploaded.
const fetchDeliveredWorks = unstable_cache(
  async () => {
    return db
      .select()
      .from(works)
      .where(isNotNull(works.image))
      .orderBy(asc(works.position))
  },
  ['works-delivered']
)

/** Gallery slots that have a real photo — what the public site renders. */
export async function getWorks(): Promise<Work[]> {
  const rows = await fetchDeliveredWorks()
  return rows.map(toWork)
}
