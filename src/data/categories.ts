export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'seating', label: 'Sofas & seating' },
  { id: 'kitchen', label: 'Kitchens & pantry' },
  { id: 'wardrobe', label: 'Wardrobes' },
  { id: 'living', label: 'TV & living' },
  { id: 'office', label: 'Office & commercial' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']
export type WorkCategoryId = Exclude<CategoryId, 'all'>
