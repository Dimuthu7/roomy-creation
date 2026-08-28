import type { Work } from '@/data/works'
import { CATEGORIES, type CategoryId } from '@/data/categories'

export const EAGER_COUNT = 8

export function filterWorks(works: Work[], category: CategoryId): Work[] {
  return category === 'all' ? [...works] : works.filter((w) => w.category === category)
}

export function isEager(index: number): boolean {
  return index < EAGER_COUNT
}

// Drops filter chips for categories with no delivered work yet — e.g. "Office
// & commercial" until the first office photo lands in public/work/ — so a
// visitor never lands on a chip that filters the grid down to nothing.
export function visibleCategories(works: Work[]) {
  const present = new Set(works.map((w) => w.category))
  return CATEGORIES.filter((c) => c.id === 'all' || present.has(c.id))
}
