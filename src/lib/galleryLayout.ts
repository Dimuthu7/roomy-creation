import type { Work } from '@/data/works'
import type { CategoryId } from '@/data/categories'

export const EAGER_COUNT = 8

export function filterWorks(works: Work[], category: CategoryId): Work[] {
  return category === 'all' ? [...works] : works.filter((w) => w.category === category)
}

export function isEager(index: number): boolean {
  return index < EAGER_COUNT
}
