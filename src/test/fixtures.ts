// Test-only stand-ins for the data that now lives in the database (src/data/site.ts,
// src/data/works.ts), reconstructed from the pre-migration seed values in
// scripts/seed.ts so existing test expectations (titles, delivered count, ratios)
// keep meaning. Import these instead of hitting the real DB-backed modules in tests.
import { TBC } from '@/lib/tbc'
import type { SiteConfig } from '@/data/site'
import type { Ratio, Work } from '@/data/works'
import type { WorkCategoryId } from '@/data/categories'
import type { Testimonial } from '@/data/testimonials'

export const SITE_FIXTURE: SiteConfig = {
  name: 'Roomy Creations',
  url: TBC,
  phone: '+94 72 292 0088',
  whatsappNumber: '+94722920088',
  email: 'roomycreation@gmail.com',
  addressLines: ['123 Main St', 'Kurunegala'],
  city: 'Kurunegala',
  postalCode: '60024',
  districts: ['Kurunegala', 'Kurunegala'],
  openingHours: ['Mo-Fr 08:30-18:00'],
  social: {
    facebook: 'https://www.facebook.com/share/1EwuWN69aJ/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/roomy_creations?igsh=ODl0ajA3bWhxZGVm',
    tiktok: 'https://www.tiktok.com/@roomy.creations?_r=1&_t=ZS-98jXoO5wqJe',
  },
  mapEmbedUrl: 'https://maps.app.goo.gl/SZjLYxW7YAM95CX56?g_st=ic',
  freeMeasurementVisit: true,
  figures: {
    yearsInBusiness: 2,
    homesFitted: 10,
    unitsDelivered: 20,
    districtsCovered: 3,
  },
}

// Same PLAN as scripts/seed.ts / the pre-migration src/data/works.ts.
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

export const ALL_WORKS_FIXTURE: Work[] = PLAN.map(([category, ratio, title], i) => {
  const n = String(i + 1).padStart(2, '0')
  return {
    id: `work-${n}`,
    category,
    ratio,
    title,
    image: `/work/work-${n}.jpg`,
    ...(i === 0 ? { beforeImage: `/work/work-${n}-before.jpg` } : {}),
    materials: TBC,
    dimensions: TBC,
    hardware: TBC,
    propertyType: TBC,
    district: TBC,
    year: TBC,
  }
})

const DELIVERED_COUNT = 5

export const WORKS_FIXTURE: Work[] = ALL_WORKS_FIXTURE.slice(0, DELIVERED_COUNT)

export const TESTIMONIALS_FIXTURE: Testimonial[] = [
  {
    id: 'testimonial-1',
    authorName: 'Nimal Perera',
    avatarUrl: 'https://scontent.example/nimal.jpg',
    reviewText: 'Fantastic work on our wardrobe — measured, built and fitted exactly as promised.',
    reviewUrl: 'https://www.facebook.com/roomycreations/posts/1',
    recommended: true,
    rating: null,
    source: 'facebook',
  },
  {
    id: 'testimonial-2',
    authorName: 'Kamala Silva',
    avatarUrl: null,
    reviewText: 'Great communication throughout and the kitchen fit is excellent.',
    reviewUrl: null,
    recommended: null,
    rating: 5,
    source: 'manual',
  },
  {
    id: 'testimonial-3',
    authorName: 'Ruwan Fernando',
    avatarUrl: null,
    reviewText: 'Very happy with the storage wall — good materials, tidy finish.',
    reviewUrl: 'https://www.facebook.com/roomycreations/posts/3',
    recommended: true,
    rating: null,
    source: 'facebook',
  },
]
