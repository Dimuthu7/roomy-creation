// One-time seed: copies the values that used to be hardcoded in src/data/site.ts
// and src/data/works.ts (now DB-backed) into the database, so it starts as an
// exact mirror of what was live — nothing invented. Values below are inlined
// from that pre-migration source rather than imported, since those files now
// read FROM the database this script is populating.
//
// Run with `npm run db:seed` (loads .env.local via tsx's --env-file). Safe to
// re-run: it upserts.
import { db } from '../src/db/client'
import { siteConfig, works } from '../src/db/schema'
import type { WorkCategoryId } from '../src/data/categories'

async function seedSiteConfig() {
  const row = {
    id: 1 as const,
    name: 'Roomy Creations',
    url: null,
    phone: '+94 72 292 0088',
    whatsappNumber: '+94722920088',
    email: 'roomycreation@gmail.com',
    addressLines: ['123 Main St', 'Kurunegala'],
    city: 'Kurunegala',
    postalCode: '60024',
    districts: ['Kurunegala', 'Kurunegala'],
    openingHours: ['Mo-Fr 08:30-18:00'],
    socialFacebook: 'https://www.facebook.com/share/1EwuWN69aJ/?mibextid=wwXIfr',
    socialInstagram: 'https://www.instagram.com/roomy_creations?igsh=ODl0ajA3bWhxZGVm',
    socialTiktok: 'https://www.tiktok.com/@roomy.creations?_r=1&_t=ZS-98jXoO5wqJe',
    mapEmbedUrl: 'https://maps.app.goo.gl/SZjLYxW7YAM95CX56?g_st=ic',
    freeMeasurementVisit: true,
    figuresYearsInBusiness: 2,
    figuresHomesFitted: 10,
    figuresUnitsDelivered: 20,
    figuresDistrictsCovered: 3,
  }

  await db.insert(siteConfig).values(row).onConflictDoUpdate({ target: siteConfig.id, set: row })
  console.log('Seeded site_config')
}

type Ratio = '3:2' | '4:3' | '16:9' | '4:5'

// Same PLAN as the pre-migration src/data/works.ts — slot order must not change,
// it's the mapping every already-supplied photograph filename depends on.
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

// How many PLAN slots had a real photo on disk pre-migration. Everything after
// this stays image: null until an admin uploads a photo for it.
const DELIVERED_COUNT = 5

async function seedWorks() {
  for (const [index, [category, ratio, title]] of PLAN.entries()) {
    const n = String(index + 1).padStart(2, '0')
    const isDelivered = index < DELIVERED_COUNT
    const row = {
      id: `work-${n}`,
      position: index + 1,
      category,
      ratio,
      image: isDelivered ? `/work/work-${n}.jpg` : null,
      beforeImage: isDelivered && index === 0 ? `/work/work-${n}-before.jpg` : null,
      title,
      materials: null,
      dimensions: null,
      hardware: null,
      propertyType: null,
      district: null,
      year: null,
    }

    await db.insert(works).values(row).onConflictDoUpdate({ target: works.id, set: row })
  }
  console.log(`Seeded ${PLAN.length} works (${DELIVERED_COUNT} delivered)`)
}

async function main() {
  await seedSiteConfig()
  await seedWorks()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
