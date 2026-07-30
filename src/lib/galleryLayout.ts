import type { Ratio, Work } from '@/data/works'
import type { CategoryId } from '@/data/categories'

export const COLUMN_UNITS = 60
export const EAGER_COUNT = 8

const RATIO_VALUE: Record<Ratio, number> = {
  '3:2': 3 / 2,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '4:5': 4 / 5,
}

export function rowSpan(ratio: Ratio, columnUnits: number = COLUMN_UNITS): number {
  return Math.round(columnUnits / RATIO_VALUE[ratio])
}

export type Offset = 'none' | 'left' | 'right'

export function offsetFor(index: number, columns: number): Offset {
  if (columns < 2) return 'none'
  const phase = index % 4
  if (phase === 1) return 'left'
  if (phase === 3) return 'right'
  return 'none'
}

export function filterWorks(works: Work[], category: CategoryId): Work[] {
  return category === 'all' ? [...works] : works.filter((w) => w.category === category)
}

export function isEager(index: number): boolean {
  return index < EAGER_COUNT
}
