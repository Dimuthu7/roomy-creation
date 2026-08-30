// Pure types/constants for a gallery work — no DB or 'server-only' dependency, so
// this stays importable from anywhere (client components, plain unit tests) without
// dragging in the data-fetching module in src/data/works.ts.
import type { Maybe } from '@/lib/tbc'
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

/** An admin-facing planned slot — unlike `Work`, `image` is null until a photo is uploaded. */
export interface WorkSlot extends Omit<Work, 'image' | 'beforeImage'> {
  image: string | null
  beforeImage: string | null
}
