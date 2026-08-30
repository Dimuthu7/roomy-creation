import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Singleton row — always id 1. Every column but `name` is nullable: null is this
// table's TBC, converted to/from the app's `Maybe<T>` sentinel in src/data/site.ts.
export const siteConfig = pgTable('site_config', {
  id: integer('id').primaryKey().default(1),
  name: text('name').notNull().default('Roomy Creations'),
  url: text('url'),
  phone: text('phone'),
  whatsappNumber: text('whatsapp_number'),
  email: text('email'),
  addressLines: text('address_lines').array(),
  city: text('city'),
  postalCode: text('postal_code'),
  districts: text('districts').array(),
  openingHours: text('opening_hours').array(),
  socialFacebook: text('social_facebook'),
  socialInstagram: text('social_instagram'),
  socialTiktok: text('social_tiktok'),
  mapEmbedUrl: text('map_embed_url'),
  freeMeasurementVisit: boolean('free_measurement_visit'),
  figuresYearsInBusiness: integer('figures_years_in_business'),
  figuresHomesFitted: integer('figures_homes_fitted'),
  figuresUnitsDelivered: integer('figures_units_delivered'),
  figuresDistrictsCovered: integer('figures_districts_covered'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// One row per planned gallery slot (work-01 .. work-24). `image` null means the
// slot has no photo yet — the public site's getWorks() only returns rows with
// a non-null image, mirroring the old ALL_WORKS/WORKS(DELIVERED_COUNT) split.
export const works = pgTable('works', {
  id: text('id').primaryKey(),
  position: integer('position').notNull(),
  category: text('category').notNull(),
  ratio: text('ratio').notNull(),
  image: text('image'),
  beforeImage: text('before_image'),
  title: text('title').notNull(),
  materials: text('materials'),
  dimensions: text('dimensions'),
  hardware: text('hardware'),
  propertyType: text('property_type'),
  district: text('district'),
  year: integer('year'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
