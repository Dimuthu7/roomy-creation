import { z } from 'zod'

// Empty input means "unset" (TBC) throughout this form, not an empty string or 0 —
// matching the site's existing Maybe<T>/TBC convention (src/lib/tbc.ts): a field
// nobody has confirmed renders nothing, rather than a guessed placeholder.
const optionalText = z
  .string()
  .transform((v) => (v.trim() === '' ? null : v.trim()))
  .nullable()

// One value per line in a <textarea> — used for address lines, districts and
// opening hours, which are all Maybe<string[]> in the SiteConfig type.
const optionalLines = z
  .string()
  .transform((v) => {
    const lines = v
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    return lines.length > 0 ? lines : null
  })
  .nullable()

const optionalInteger = z
  .string()
  .transform((v, ctx) => {
    if (v.trim() === '') return null
    const n = Number(v)
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      ctx.addIssue({ code: 'custom', message: 'Must be a whole number' })
      return z.NEVER
    }
    return n
  })
  .nullable()

export const siteConfigFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  url: optionalText,
  phone: optionalText,
  whatsappNumber: optionalText,
  email: optionalText,
  addressLines: optionalLines,
  city: optionalText,
  postalCode: optionalText,
  districts: optionalLines,
  openingHours: optionalLines,
  facebook: optionalText,
  instagram: optionalText,
  tiktok: optionalText,
  mapEmbedUrl: optionalText,
  // A 3-way choice, not a checkbox — "unknown" is a real, distinct state (Maybe<boolean>),
  // not the same as "no".
  freeMeasurementVisit: z.enum(['unknown', 'true', 'false']).transform((v) => {
    if (v === 'unknown') return null
    return v === 'true'
  }),
  yearsInBusiness: optionalInteger,
  homesFitted: optionalInteger,
  unitsDelivered: optionalInteger,
  districtsCovered: optionalInteger,
})

export type SiteConfigFormInput = z.infer<typeof siteConfigFormSchema>
