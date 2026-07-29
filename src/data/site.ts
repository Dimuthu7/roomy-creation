import { TBC, type Maybe } from '@/lib/tbc'

export interface SiteConfig {
  name: string
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
  /** Figures section. Numbers only. */
  figures: {
    yearsInBusiness: Maybe<number>
    homesFitted: Maybe<number>
    unitsDelivered: Maybe<number>
    districtsCovered: Maybe<number>
  }
}

export const SITE: SiteConfig = {
  name: 'Roomy Creations',
  phone: TBC,
  whatsappNumber: TBC,
  email: TBC,
  addressLines: TBC,
  city: TBC,
  postalCode: TBC,
  districts: TBC,
  openingHours: TBC,
  social: { facebook: TBC, instagram: TBC, tiktok: TBC },
  mapEmbedUrl: TBC,
  freeMeasurementVisit: TBC,
  figures: {
    yearsInBusiness: TBC,
    homesFitted: TBC,
    unitsDelivered: TBC,
    districtsCovered: TBC,
  },
}
