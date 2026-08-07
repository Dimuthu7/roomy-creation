import type { Metadata, Viewport } from 'next'
import { isTBC } from './tbc'
import { BRAND } from './brand'
import type { SiteConfig } from '@/data/site'

// F5: SITE.url is [TBC] until the client confirms the production domain, and
// generate-metadata.md:428 is explicit — "using a relative path in a URL-based
// metadata field without configuring a metadataBase will cause a build error." A
// guessed domain is worse than no domain: Task 13 already had an invented email
// address caught in review, and this is the same mistake through a different field.
// metadataBase is set only once SITE.url is known.
//
// No og:image ships in this task: there is no real photograph and a placeholder is
// banned, so `openGraph.images` is left unset entirely rather than pointed at
// nothing.
const DESCRIPTION = 'Fitted furniture, measured and installed in Sri Lanka.'

export function buildMetadata(site: SiteConfig): Metadata {
  return {
    title: site.name,
    description: DESCRIPTION,
    ...(isTBC(site.url) ? {} : { metadataBase: new URL(site.url) }),
    openGraph: {
      title: site.name,
      description: DESCRIPTION,
      type: 'website',
      locale: 'en_LK',
    },
  }
}

// `themeColor` on `metadata` is deprecated as of Next 14 — generate-metadata.md:654
// steers it to the `viewport` export instead (generate-viewport.md). Sampled from
// BRAND rather than retyped, so it cannot drift from the palette it names.
export const viewport: Viewport = {
  themeColor: BRAND.navy,
}
