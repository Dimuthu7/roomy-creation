import { isTBC, omitTBC } from './tbc'
import type { SiteConfig } from '@/data/site'

export function buildLocalBusinessSchema(site: SiteConfig): Record<string, unknown> {
  const address = omitTBC({
    streetAddress: isTBC(site.addressLines) ? '[TBC]' : site.addressLines.join(', '),
    addressLocality: site.city,
    postalCode: site.postalCode,
  })

  const sameAs = [site.social.facebook, site.social.instagram, site.social.tiktok]
    .filter((u): u is string => !isTBC(u))

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.name,
    description:
      'Fitted furniture maker. Built-in wardrobes, pantry cupboards, modular kitchens, ' +
      'TV and storage walls, and upholstered sofas, measured and installed on site.',
    ...omitTBC({
      telephone: site.phone,
      email: site.email,
      openingHours: site.openingHours,
    }),
    ...(Object.keys(address).length > 0
      ? { address: { '@type': 'PostalAddress', ...address, addressCountry: 'LK' } }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}
