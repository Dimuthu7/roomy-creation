// One-time seed: copies the values that used to be hardcoded in src/data/site.ts
// and src/data/works.ts (now DB-backed) into the database, so it starts as an
// exact mirror of what was live — nothing invented. Values below are inlined
// from that pre-migration source rather than imported, since those files now
// read FROM the database this script is populating.
//
// Run with `npm run db:seed` (loads .env.local via tsx's --env-file). Safe to
// re-run: it upserts.
import { randomUUID } from 'crypto'
import { sql } from 'drizzle-orm'
import { db } from '../src/db/client'
import { clauseLibrary, counters, siteConfig, works } from '../src/db/schema'
import type { WorkCategoryId } from '../src/data/categories'
import { JOB_REF_SEED } from '../src/lib/jobs/reference'

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

// The counter the RC reference numbering picks up from — see JOB_REF_SEED's doc
// comment. Invoice and warranty card series start from zero since nothing on paper
// numbered them.
async function seedCounters() {
  await db
    .insert(counters)
    .values([
      { key: 'job_ref', value: JOB_REF_SEED },
      { key: 'invoice', value: 0 },
      { key: 'warranty_card', value: 0 },
    ])
    .onConflictDoNothing()
  console.log('Seeded counters')
}

// The six standard terms, transcribed from the real RC188/RC194 paper quotations.
// Clause 6 is bold on both documents. A new job pre-selects every active clause, so
// the common case of "use our standard terms" is zero clicks.
const STANDARD_TERMS = [
  'Manufacturing time - 15 to 30 days after the advance payment paid.',
  'This quotation is valid only for the design provided.',
  'Prices are valid for 20 days from the date stipulated on the estimate, due to the prevailing market conditions.',
  'Please confirm your acceptance of this quote by signing this document.',
  'Payment terms - Project start after 60% of advance payment. The remaining amount must be paid during installing the product.',
  '3 Years Warranty for Product. (only responsible for manufacturing defects)',
]

// Guarded by an existence check rather than onConflictDoNothing: id is a fresh
// randomUUID() per row, so there is no natural conflict target to dedupe on — an
// unconditional insert would duplicate these six rows on every re-run.
async function seedClauseLibrary() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(clauseLibrary)
  if (Number(count) > 0) {
    console.log('Skipped clause_library seed (rows already exist)')
    return
  }

  await db.insert(clauseLibrary).values(
    STANDARD_TERMS.map((body, i) => ({
      id: randomUUID(),
      kind: 'terms' as const,
      body,
      emphasis: i === STANDARD_TERMS.length - 1,
      position: i,
      active: true,
    })),
  )
  console.log(`Seeded ${STANDARD_TERMS.length} terms clauses`)
}

async function main() {
  await seedSiteConfig()
  await seedWorks()
  await seedCounters()
  await seedClauseLibrary()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
