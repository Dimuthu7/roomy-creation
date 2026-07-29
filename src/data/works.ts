import { TBC, type Maybe } from '@/lib/tbc'
import type { WorkCategoryId } from './categories'

export const RATIOS = ['3:2', '4:3', '16:9', '4:5'] as const
export type Ratio = (typeof RATIOS)[number]

export type PropertyType = 'house' | 'apartment' | 'hotel' | 'office'

export interface Work {
  id: string
  category: WorkCategoryId
  ratio: Ratio
  image: string
  /** Optional bare-wall shot. Present ⇒ lightbox shows the compare slider. */
  beforeImage?: string
  /** Short descriptor, e.g. 'Built-in wardrobe'. Safe to state. */
  title: string
  materials: Maybe<string>
  dimensions: Maybe<string>
  hardware: Maybe<string>
  propertyType: Maybe<PropertyType>
  district: Maybe<string>
  year: Maybe<number>
}

const PLAN: Array<[WorkCategoryId, Ratio, string]> = [
  ['wardrobe', '3:2', 'Built-in wardrobe'],
  ['kitchen', '16:9', 'Fitted kitchen run'],
  ['seating', '4:3', 'Upholstered three-seat sofa'],
  ['living', '3:2', 'TV and storage wall'],
  ['wardrobe', '4:5', 'Full-height wardrobe'],
  ['office', '3:2', 'Study fit-out'],
  ['kitchen', '4:3', 'Pantry cupboard'],
  ['seating', '3:2', 'Armchair and side unit'],
  ['living', '16:9', 'Living storage run'],
  ['wardrobe', '4:3', 'Corner wardrobe'],
  ['kitchen', '3:2', 'Modular kitchen'],
  ['office', '4:3', 'Office workstations'],
  ['seating', '4:3', 'Two-seat sofa'],
  ['living', '3:2', 'Media unit'],
  ['wardrobe', '4:5', 'Walk-in wardrobe'],
  ['kitchen', '16:9', 'Kitchen and pantry'],
  ['office', '3:2', 'Reception counter'],
  ['seating', '3:2', 'Bedroom seating'],
  ['living', '4:3', 'Display and storage wall'],
  ['wardrobe', '4:5', 'Bedroom wardrobe'],
  ['kitchen', '3:2', 'Island and pantry'],
  ['office', '16:9', 'Meeting room storage'],
  ['seating', '4:3', 'Sofa and storage'],
  ['living', '3:2', 'Storage wall'],
]

export const WORKS: Work[] = PLAN.map(([category, ratio, title], i) => {
  const n = String(i + 1).padStart(2, '0')
  return {
    id: `work-${n}`,
    category,
    ratio,
    title,
    image: `/work/work-${n}.jpg`,
    // Slot 1 demonstrates the compare slider. Add `work-NN-before.jpg` to enable more.
    ...(i === 0 ? { beforeImage: `/work/work-${n}-before.jpg` } : {}),
    materials: TBC,
    dimensions: TBC,
    hardware: TBC,
    propertyType: TBC,
    district: TBC,
    year: TBC,
  }
})
