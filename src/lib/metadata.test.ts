import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { BRAND } from './brand'
import { buildMetadata, viewport } from './metadata'
import { SITE } from '@/data/site'

// F5: generate-metadata.md:428 — "Using a relative path in a URL-based metadata
// field without configuring a metadataBase will cause a build error." The production
// domain is unknown (SITE.url is [TBC] today), so metadataBase must be omitted
// entirely rather than guessing a domain — Task 13 already had an invented domain
// caught in review.
describe('buildMetadata', () => {
  it('omits metadataBase while the production domain is unknown', () => {
    const m = buildMetadata({ ...SITE, url: TBC })
    expect(m.metadataBase).toBeUndefined()
  })

  it('sets metadataBase to the configured origin once SITE.url is known', () => {
    const m = buildMetadata({ ...SITE, url: 'https://roomycreations.lk' })
    expect(m.metadataBase).toEqual(new URL('https://roomycreations.lk'))
  })

  it('carries the site name as the title and the approved description', () => {
    const m = buildMetadata(SITE)
    expect(m.title).toBe('Roomy Creations')
    expect(m.description).toBe('Fitted furniture, measured and installed in Sri Lanka.')
  })

  // No og:image ships in this task — we have no image, and a placeholder one is
  // banned. openGraph still carries title, description, type and locale.
  it('sets openGraph title, description, type and locale, and no images field', () => {
    const m = buildMetadata(SITE)
    // `Metadata['openGraph']` is a union keyed on `type` (article/book/website/...),
    // and one branch (the bare fallback) carries no `type` field at all, so TS
    // refuses to read `.type` off the union directly without narrowing first.
    const og = m.openGraph as {
      title?: string
      description?: string
      type?: string
      locale?: string
    }
    expect(og.title).toBe('Roomy Creations')
    expect(og.description).toBe('Fitted furniture, measured and installed in Sri Lanka.')
    expect(og.type).toBe('website')
    expect(og.locale).toBe('en_LK')
    expect(m.openGraph).not.toHaveProperty('images')
  })
})

// F5/AGENTS.md: themeColor is deprecated on `metadata` since Next 14 — it belongs on
// the `viewport` export instead (generate-metadata.md:654).
describe('viewport', () => {
  it('sets themeColor to the brand navy, sampled from BRAND rather than retyped', () => {
    expect(viewport.themeColor).toBe(BRAND.navy)
  })
})
