import 'server-only'
import { unstable_cache } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { siteConfig } from '@/db/schema'
import { TBC, type Maybe } from '@/lib/tbc'

export interface SiteConfig {
  name: string
  /** Production origin, no trailing slash, e.g. 'https://example.com'. Required before
   *  any absolute-URL metadata works. */
  url: Maybe<string>
  /** International format, no spaces. e.g. '+94112345678' */
  phone: Maybe<string>
  /** Digits only, country code first, no plus. e.g. '94771234567' */
  whatsappNumber: Maybe<string>
  email: Maybe<string>
  /** Street lines only. City and postcode are separate. */
  addressLines: Maybe<string[]>
  city: Maybe<string>
  postalCode: Maybe<string>
  /** Districts installed in. Drives SEO copy and the footer coverage note. */
  districts: Maybe<string[]>
  /** Schema.org format. e.g. ['Mo-Sa 09:00-18:00'] */
  openingHours: Maybe<string[]>
  social: {
    facebook: Maybe<string>
    instagram: Maybe<string>
    tiktok: Maybe<string>
  }
  /** Google Maps embed src URL. */
  mapEmbedUrl: Maybe<string>
  /** Set true ONLY if measurement visits really are free and non-obligatory. */
  freeMeasurementVisit: Maybe<boolean>
  /** Position's stat strip. Numbers only. */
  figures: {
    yearsInBusiness: Maybe<number>
    homesFitted: Maybe<number>
    unitsDelivered: Maybe<number>
    districtsCovered: Maybe<number>
  }
}

function orTBC<T>(value: T | null): Maybe<T> {
  return value === null ? TBC : value
}

const fetchSiteConfig = unstable_cache(
  async (): Promise<SiteConfig> => {
    const [row] = await db.select().from(siteConfig).where(eq(siteConfig.id, 1)).limit(1)
    if (!row) {
      throw new Error('site_config row (id=1) is missing — run `npm run db:seed`.')
    }
    return {
      name: row.name,
      url: orTBC(row.url),
      phone: orTBC(row.phone),
      whatsappNumber: orTBC(row.whatsappNumber),
      email: orTBC(row.email),
      addressLines: orTBC(row.addressLines),
      city: orTBC(row.city),
      postalCode: orTBC(row.postalCode),
      districts: orTBC(row.districts),
      openingHours: orTBC(row.openingHours),
      social: {
        facebook: orTBC(row.socialFacebook),
        instagram: orTBC(row.socialInstagram),
        tiktok: orTBC(row.socialTiktok),
      },
      mapEmbedUrl: orTBC(row.mapEmbedUrl),
      freeMeasurementVisit: orTBC(row.freeMeasurementVisit),
      figures: {
        yearsInBusiness: orTBC(row.figuresYearsInBusiness),
        homesFitted: orTBC(row.figuresHomesFitted),
        unitsDelivered: orTBC(row.figuresUnitsDelivered),
        districtsCovered: orTBC(row.figuresDistrictsCovered),
      },
    }
  },
  ['site-config']
)

/** Reads the site's contact/business details and stats from the database. */
export async function getSiteConfig(): Promise<SiteConfig> {
  return fetchSiteConfig()
}
