import { TBC, type Maybe } from '@/lib/tbc'

export interface SiteConfig {
  name: string
  /** Production origin, no trailing slash, e.g. 'https://example.com'. Required before
   *  any absolute-URL metadata works. The example is deliberately not a plausible
   *  Roomy Creations domain: a guess written here is a guess somebody later pastes in
   *  as fact, which is exactly how an invented address reached the enquiry route. */
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

export const SITE: SiteConfig = {
  name: 'Roomy Creations',
  url: TBC,
  phone: "+94 72 292 0088",
  whatsappNumber: "+94722920088",
  email: "roomycreation@gmail.com",
  addressLines: ["123 Main St", "Kurunegala"],
  city: "Kurunegala",
  postalCode: "60024",
  districts: ["Kurunegala", "Kurunegala"],
  openingHours: ["Mo-Fr 08:30-18:00"],
  social: { 
    facebook: "https://www.facebook.com/share/1EwuWN69aJ/?mibextid=wwXIfr", 
    instagram: "https://www.instagram.com/roomy_creations?igsh=ODl0ajA3bWhxZGVm", 
    tiktok: "https://www.tiktok.com/@roomy.creations?_r=1&_t=ZS-98jXoO5wqJe" 
  },
  mapEmbedUrl: "https://maps.app.goo.gl/SZjLYxW7YAM95CX56?g_st=ic",
  freeMeasurementVisit: true,
  figures: {
    yearsInBusiness: 2,
    homesFitted: 10,
    unitsDelivered: 20,
    districtsCovered: 3,
  },
}
