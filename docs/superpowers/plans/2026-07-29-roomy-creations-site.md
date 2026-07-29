# Roomy Creations Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js marketing site for Roomy Creations, a Sri Lankan fitted-furniture maker, whose gallery, film section and enquiry paths convince a stranger the company will measure their apartment correctly and finish cleanly.

**Architecture:** All layout, filtering, contrast, sync and formatting logic is extracted into pure functions under `src/lib/`, unit-tested in isolation; React components in `src/components/` are thin consumers of those functions. All unverified business facts live in two typed data files (`src/data/site.ts`, `src/data/specs.ts`) behind a `[TBC]` sentinel type, so structured data and copy degrade correctly rather than emitting placeholder text.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, GSAP + ScrollTrigger, Lenis, Framer Motion, Zod, Resend, Vitest + React Testing Library.

## Global Constraints

These apply to **every** task. Do not restate, do not violate.

- **Brand colours are exact.** Navy `#023048`, Yellow `#F5CA4A`, Teal `#1FA2C0`, Sky `#8FCBE7`, Paper `#F1F5F8`. Never substitute or tint. Never add cream, terracotta or gold.
- **Contrast rules.** Teal is **never** used for text or controls on Paper (2.7:1). Teal on Navy only at 16px+, preferred as rules and shapes. On Paper sections text is Navy and the only accent is a filled Yellow block with Navy type.
- **Focus rings.** Yellow on navy grounds, Navy on paper grounds. Always visible.
- **Typography.** Display: Outfit 600–700, negative tracking. Body: Instrument Sans 17–18px / 1.6. Utility: IBM Plex Mono, small, wide-tracked caps. No serifs, no script.
- **Banned copy:** `nestled`, `boasts`, `epitome`, `exquisite`, `unparalleled`, `where tradition meets modernity`, `one-stop solution`, `we strive to`, `dream home`, `turnkey`. No exclamation marks anywhere in user-facing copy.
- **Never invent facts.** No awards, certifications, client names, hardware brands, districts, dimensions or years the client has not supplied. Use the `[TBC]` sentinel.
- **Not a shop.** No cart, no checkout, no prices, anywhere.
- **No Three.js.** No 3D rendering libraries.
- **Motion.** Durations 200–450ms, slight overshoot, decisive easing. Nothing floats, drifts or bounces continuously. `prefers-reduced-motion` disables all transforms, the custom cursor, Lenis and autoplay.
- **Accessibility.** Semantic heading order, alt text on every image, keyboard navigable, AA contrast.
- **Commit after every task.** Conventional commit messages.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/tbc.ts` | `[TBC]` sentinel type, guards, omission helpers. Spine of the whole no-invented-facts rule. |
| `src/lib/brand.ts` | Exact brand hex values + WCAG contrast ratio function. Guards the palette. |
| `src/lib/schema.ts` | Builds LocalBusiness JSON-LD from `site.ts`, omitting `[TBC]`. |
| `src/lib/galleryLayout.ts` | Ratio → grid row span, offset assignment, category filtering. |
| `src/lib/workAlt.ts` | Generates real alt text from a work record. |
| `src/lib/lightboxNav.ts` | Next/prev index wrapping. |
| `src/lib/filmCards.ts` | Video `currentTime` → data-card index. |
| `src/lib/whatsapp.ts` | `wa.me` URL construction with pre-filled message. |
| `src/lib/enquirySchema.ts` | Zod schema shared by client and server. |
| `src/data/site.ts` | Every business fact. All `[TBC]`. |
| `src/data/specs.ts` | Materials specs + film card figures + clip start timestamps. All `[TBC]`. |
| `src/data/categories.ts` | The six filter categories. |
| `src/data/works.ts` | 24 typed project records. |
| `src/hooks/useMotionLevel.ts` | `full \| reduced \| mobile`. Single source of motion truth. |
| `src/hooks/useCountUp.ts` | Figures counting animation. |
| `src/components/gallery/*` | Grid, card, filter row, lightbox, before/after slider. |
| `src/components/sections/*` | The ten page sections. |
| `src/components/chrome/*` | Nav, Footer, CustomCursor, SmoothScroll, WhatsAppFloat. |
| `src/components/weave/*` | WeaveDivider, WeaveTexture, WeaveReveal. |
| `src/app/api/enquiry/route.ts` | Resend handler. |

---

## Phase A — no Higgsfield credits required

### Task 1: Scaffold, test harness, brand tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/brand.ts`
- Test: `src/lib/brand.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `BRAND` (frozen record of the five hex strings), `contrastRatio(fg: string, bg: string): number`.

- [ ] **Step 1: Scaffold the project**

Run in the project root (the directory already contains `docs/`, so scaffold in place):

```bash
npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --no-turbopack --import-alias "@/*"
```

Accept overwriting nothing under `docs/`. Then add dependencies:

```bash
npm i gsap lenis framer-motion zod resend
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths
```

- [ ] **Step 2: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Write the failing test**

Create `src/lib/brand.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { BRAND, contrastRatio } from './brand'

describe('BRAND', () => {
  it('holds the exact sampled hex values', () => {
    expect(BRAND).toEqual({
      navy: '#023048',
      yellow: '#F5CA4A',
      teal: '#1FA2C0',
      sky: '#8FCBE7',
      paper: '#F1F5F8',
    })
  })
})

describe('contrastRatio', () => {
  it('matches the documented ratios for text pairs', () => {
    expect(contrastRatio(BRAND.yellow, BRAND.navy)).toBeCloseTo(8.8, 1)
    expect(contrastRatio(BRAND.sky, BRAND.navy)).toBeCloseTo(7.8, 1)
    expect(contrastRatio(BRAND.teal, BRAND.navy)).toBeCloseTo(4.6, 1)
  })

  it('confirms teal on paper is below AA large-text minimum', () => {
    expect(contrastRatio(BRAND.teal, BRAND.paper)).toBeLessThan(3)
  })

  it('confirms navy on paper is safe for focus rings', () => {
    expect(contrastRatio(BRAND.navy, BRAND.paper)).toBeGreaterThan(7)
  })

  it('is symmetric', () => {
    expect(contrastRatio(BRAND.navy, BRAND.yellow))
      .toBeCloseTo(contrastRatio(BRAND.yellow, BRAND.navy), 5)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/lib/brand.test.ts`
Expected: FAIL — cannot resolve `./brand`.

- [ ] **Step 5: Implement brand.ts**

Create `src/lib/brand.ts`:

```ts
export const BRAND = Object.freeze({
  navy: '#023048',
  yellow: '#F5CA4A',
  teal: '#1FA2C0',
  sky: '#8FCBE7',
  paper: '#F1F5F8',
})

export type BrandColour = keyof typeof BRAND

function channel(value: number): number {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/brand.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Wire tokens and fonts**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-navy: #023048;
  --color-yellow: #F5CA4A;
  --color-teal: #1FA2C0;
  --color-sky: #8FCBE7;
  --color-paper: #F1F5F8;

  --font-display: var(--font-outfit);
  --font-body: var(--font-instrument);
  --font-mono: var(--font-plex-mono);
}

html {
  background-color: var(--color-navy);
}

body {
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--color-sky);
}

:focus-visible {
  outline: 2px solid var(--color-yellow);
  outline-offset: 3px;
}

.on-paper :focus-visible {
  outline-color: var(--color-navy);
}

.u-mono {
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.75rem;
}
```

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Outfit, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', weight: ['600', '700'] })
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Roomy Creations',
  description: 'Fitted furniture, measured and installed in Sri Lanka.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: Verify the app builds**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js site with brand tokens and contrast guard"
```

---

### Task 2: The `[TBC]` sentinel

**Files:**
- Create: `src/lib/tbc.ts`
- Test: `src/lib/tbc.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TBC` (the literal `'[TBC]'`), `type Maybe<T> = T | typeof TBC`, `isTBC(v: unknown): boolean`, `resolve<T>(v: Maybe<T>, fallback: T): T`, `omitTBC<T extends object>(o: T): Partial<T>`, `joinDefined(parts: Maybe<string>[], sep: string): string`.

This module is why no placeholder text ever reaches a user or a search engine. Every later task depends on it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/tbc.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TBC, isTBC, resolve, omitTBC, joinDefined } from './tbc'

describe('isTBC', () => {
  it('detects the sentinel', () => {
    expect(isTBC(TBC)).toBe(true)
  })
  it('rejects real values, including empty string and zero', () => {
    expect(isTBC('Colombo')).toBe(false)
    expect(isTBC('')).toBe(false)
    expect(isTBC(0)).toBe(false)
    expect(isTBC(undefined)).toBe(false)
  })
})

describe('resolve', () => {
  it('returns the value when set', () => {
    expect(resolve('18mm', 'unknown')).toBe('18mm')
  })
  it('returns the fallback when TBC', () => {
    expect(resolve(TBC, 'unknown')).toBe('unknown')
  })
})

describe('omitTBC', () => {
  it('drops TBC keys so structured data stays valid', () => {
    expect(omitTBC({ name: 'Roomy Creations', telephone: TBC, city: 'Colombo' }))
      .toEqual({ name: 'Roomy Creations', city: 'Colombo' })
  })
  it('returns an empty object when everything is TBC', () => {
    expect(omitTBC({ a: TBC, b: TBC })).toEqual({})
  })
  it('keeps falsy real values', () => {
    expect(omitTBC({ count: 0, note: '' })).toEqual({ count: 0, note: '' })
  })
})

describe('joinDefined', () => {
  it('joins only the real parts', () => {
    expect(joinDefined(['Built-in wardrobe', TBC, 'Colombo'], ', '))
      .toBe('Built-in wardrobe, Colombo')
  })
  it('returns an empty string when nothing is known', () => {
    expect(joinDefined([TBC, TBC], ', ')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tbc.test.ts`
Expected: FAIL — cannot resolve `./tbc`.

- [ ] **Step 3: Implement tbc.ts**

Create `src/lib/tbc.ts`:

```ts
export const TBC = '[TBC]' as const
export type TBCValue = typeof TBC
export type Maybe<T> = T | TBCValue

export function isTBC(value: unknown): value is TBCValue {
  return value === TBC
}

export function resolve<T>(value: Maybe<T>, fallback: T): T {
  return isTBC(value) ? fallback : (value as T)
}

export function omitTBC<T extends object>(source: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [key, value] of Object.entries(source)) {
    if (!isTBC(value)) out[key as keyof T] = value as T[keyof T]
  }
  return out
}

export function joinDefined(parts: Maybe<string>[], separator: string): string {
  return parts.filter((p): p is string => !isTBC(p) && p !== '').join(separator)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tbc.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tbc.ts src/lib/tbc.test.ts
git commit -m "feat: add TBC sentinel so unverified facts never reach output"
```

---

### Task 3: Site config and LocalBusiness structured data

**Files:**
- Create: `src/data/site.ts`
- Create: `src/lib/schema.ts`
- Test: `src/lib/schema.test.ts`

**Interfaces:**
- Consumes: `TBC`, `Maybe`, `isTBC`, `omitTBC` from `@/lib/tbc`.
- Produces: `SITE: SiteConfig`, `buildLocalBusinessSchema(site: SiteConfig): Record<string, unknown>`.

`SiteConfig` fields used by later tasks: `whatsappNumber`, `phone`, `email`, `addressLines`, `city`, `districts`, `openingHours`, `social.facebook`, `social.instagram`, `social.tiktok`, `mapEmbedUrl`, `freeMeasurementVisit`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { buildLocalBusinessSchema } from './schema'
import { SITE } from '@/data/site'

const filled = {
  ...SITE,
  phone: '+94112345678',
  email: 'hello@example.lk',
  city: 'Colombo',
  addressLines: ['12 Example Road'],
  postalCode: '00300',
  openingHours: ['Mo-Fr 09:00-18:00'],
}

describe('buildLocalBusinessSchema', () => {
  it('always emits the LocalBusiness type and name', () => {
    const s = buildLocalBusinessSchema(SITE)
    expect(s['@type']).toBe('LocalBusiness')
    expect(s.name).toBe('Roomy Creations')
  })

  it('omits TBC fields rather than emitting the placeholder', () => {
    const s = buildLocalBusinessSchema({ ...SITE, phone: TBC, email: TBC })
    expect(JSON.stringify(s)).not.toContain('[TBC]')
    expect(s.telephone).toBeUndefined()
  })

  it('includes fields once they are filled in', () => {
    const s = buildLocalBusinessSchema(filled)
    expect(s.telephone).toBe('+94112345678')
    expect(s.email).toBe('hello@example.lk')
    expect(s.openingHours).toEqual(['Mo-Fr 09:00-18:00'])
  })

  it('builds a PostalAddress only when address parts exist', () => {
    expect(buildLocalBusinessSchema({ ...SITE, city: TBC, addressLines: TBC }).address)
      .toBeUndefined()
    const addr = buildLocalBusinessSchema(filled).address as Record<string, unknown>
    expect(addr['@type']).toBe('PostalAddress')
    expect(addr.addressLocality).toBe('Colombo')
    expect(addr.addressCountry).toBe('LK')
  })

  it('never contains a price or offer, since this is not a shop', () => {
    const json = JSON.stringify(buildLocalBusinessSchema(filled))
    expect(json).not.toContain('priceRange')
    expect(json).not.toContain('Offer')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: FAIL — cannot resolve `@/data/site`.

- [ ] **Step 3: Create the site config**

Create `src/data/site.ts`. Every value the client has not supplied is `TBC`, with the expected format in a comment.

```ts
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
```

- [ ] **Step 4: Implement schema.ts**

Create `src/lib/schema.ts`:

```ts
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
```

Note the `streetAddress` line uses `'[TBC]'` inside `omitTBC`, which strips it — this keeps the join readable while still guaranteeing the placeholder never escapes.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/data/site.ts src/lib/schema.ts src/lib/schema.test.ts
git commit -m "feat: add site config and LocalBusiness schema that omits unknown facts"
```

---

### Task 4: Work records, categories and alt text

**Files:**
- Create: `src/data/categories.ts`
- Create: `src/data/works.ts`
- Create: `src/lib/workAlt.ts`
- Test: `src/data/works.test.ts`, `src/lib/workAlt.test.ts`

**Interfaces:**
- Consumes: `TBC`, `Maybe`, `joinDefined` from `@/lib/tbc`.
- Produces: `CATEGORIES: Category[]`, `type CategoryId`, `type Ratio = '3:2' | '4:3' | '16:9' | '4:5'`, `type Work`, `WORKS: Work[]`, `workAlt(work: Work): string`.

- [ ] **Step 1: Create the categories**

Create `src/data/categories.ts`:

```ts
export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'seating', label: 'Sofas & seating' },
  { id: 'kitchen', label: 'Kitchens & pantry' },
  { id: 'wardrobe', label: 'Wardrobes' },
  { id: 'living', label: 'TV & living' },
  { id: 'office', label: 'Office & commercial' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']
export type WorkCategoryId = Exclude<CategoryId, 'all'>
```

- [ ] **Step 2: Write the failing data-integrity test**

Create `src/data/works.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WORKS, RATIOS } from './works'
import { CATEGORIES } from './categories'

describe('WORKS', () => {
  it('has 24 records', () => {
    expect(WORKS).toHaveLength(24)
  })

  it('has unique ids', () => {
    expect(new Set(WORKS.map((w) => w.id)).size).toBe(24)
  })

  it('points every record at its numbered image slot', () => {
    WORKS.forEach((w, i) => {
      const n = String(i + 1).padStart(2, '0')
      expect(w.image).toBe(`/work/work-${n}.jpg`)
    })
  })

  it('only uses permitted aspect ratios', () => {
    for (const w of WORKS) expect(RATIOS).toContain(w.ratio)
  })

  it('is landscape-dominant, as these are rooms not products', () => {
    const portrait = WORKS.filter((w) => w.ratio === '4:5').length
    expect(portrait).toBeLessThanOrEqual(6)
  })

  it('covers every filter category', () => {
    const used = new Set(WORKS.map((w) => w.category))
    for (const c of CATEGORIES.filter((c) => c.id !== 'all')) {
      expect(used).toContain(c.id)
    }
  })

  it('has at least one before image so the compare slider is exercised', () => {
    expect(WORKS.some((w) => w.beforeImage !== undefined)).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/works.test.ts`
Expected: FAIL — cannot resolve `./works`.

- [ ] **Step 4: Implement works.ts**

Create `src/data/works.ts`. Factual fields are `TBC`; only the category, ratio and slot are real.

```ts
import { TBC, type Maybe } from '@/lib/tbc'
import type { WorkCategoryId } from './categories'

export const RATIOS = ['3:2', '4:3', '16:9', '4:5'] as const
export type Ratio = (typeof RATIOS)[number]

export type PropertyType = 'house' | 'apartment' | 'hotel' | 'office'

export interface Work {
  id: string
  category: WorkCategoryId
  ratio: Ratio
  image: string
  /** Optional bare-wall shot. Present ⇒ lightbox shows the compare slider. */
  beforeImage?: string
  /** Short descriptor, e.g. 'Built-in wardrobe'. Safe to state. */
  title: string
  materials: Maybe<string>
  dimensions: Maybe<string>
  hardware: Maybe<string>
  propertyType: Maybe<PropertyType>
  district: Maybe<string>
  year: Maybe<number>
}

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

export const WORKS: Work[] = PLAN.map(([category, ratio, title], i) => {
  const n = String(i + 1).padStart(2, '0')
  return {
    id: `work-${n}`,
    category,
    ratio,
    title,
    image: `/work/work-${n}.jpg`,
    // Slot 1 demonstrates the compare slider. Add `work-NN-before.jpg` to enable more.
    ...(i === 0 ? { beforeImage: `/work/work-${n}-before.jpg` } : {}),
    materials: TBC,
    dimensions: TBC,
    hardware: TBC,
    propertyType: TBC,
    district: TBC,
    year: TBC,
  }
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/works.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Write the failing alt-text test**

Create `src/lib/workAlt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { workAlt } from './workAlt'
import { WORKS } from '@/data/works'

const base = WORKS[1]

// Shape: {title}[ in {article}][ in {district}][, {materials},] by Roomy Creations
// Place reads as one natural phrase; the spec detail follows as an appositive.
describe('workAlt', () => {
  it('falls back to the title alone when nothing else is known', () => {
    expect(workAlt(base)).toBe('Fitted kitchen run by Roomy Creations')
  })

  it('reads place first, then spec, when everything is known', () => {
    expect(workAlt({
      ...base, materials: '18mm board', propertyType: 'apartment', district: 'Colombo',
    })).toBe('Fitted kitchen run in an apartment in Colombo, 18mm board, by Roomy Creations')
  })

  it('adds property type when known', () => {
    expect(workAlt({ ...base, propertyType: 'apartment' }))
      .toBe('Fitted kitchen run in an apartment by Roomy Creations')
  })

  it('keeps the preposition when district is the only known field', () => {
    expect(workAlt({ ...base, district: 'Colombo' }))
      .toBe('Fitted kitchen run in Colombo by Roomy Creations')
  })

  it('sets materials off as an appositive when it is the only known field', () => {
    expect(workAlt({ ...base, materials: 'matte white board' }))
      .toBe('Fitted kitchen run, matte white board, by Roomy Creations')
  })

  it('joins property type and district into one phrase, with no doubled preposition', () => {
    expect(workAlt({ ...base, propertyType: 'apartment', district: 'Colombo' }))
      .toBe('Fitted kitchen run in an apartment in Colombo by Roomy Creations')
  })

  it('never emits the TBC placeholder', () => {
    for (const w of WORKS) expect(workAlt(w)).not.toContain('[TBC]')
  })

  it('produces a non-empty string for every record', () => {
    for (const w of WORKS) expect(workAlt(w).length).toBeGreaterThan(10)
  })

  it('uses the correct article for office', () => {
    expect(workAlt({ ...base, propertyType: 'office' }))
      .toBe('Fitted kitchen run in an office by Roomy Creations')
  })
})
```

- [ ] **Step 7: Implement workAlt.ts**

Create `src/lib/workAlt.ts`:

```ts
import { isTBC, joinDefined } from './tbc'
import type { PropertyType, Work } from '@/data/works'

const ARTICLE: Record<PropertyType, string> = {
  house: 'a house',
  apartment: 'an apartment',
  hotel: 'a hotel',
  office: 'an office',
}

export function workAlt(work: Work): string {
  // Property type and district form one place phrase — "in an apartment in Colombo" —
  // so the preposition is never dropped and never doubled.
  const place = joinDefined(
    [
      isTBC(work.propertyType) ? work.propertyType : `in ${ARTICLE[work.propertyType]}`,
      isTBC(work.district) ? work.district : `in ${work.district}`,
    ],
    ' ',
  )
  // Materials follow as an appositive, set off by commas.
  const spec = isTBC(work.materials) ? '' : `, ${work.materials},`

  return `${work.title}${place ? ` ${place}` : ''}${spec} by Roomy Creations`
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/lib/workAlt.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 9: Commit**

```bash
git add src/data/categories.ts src/data/works.ts src/data/works.test.ts src/lib/workAlt.ts src/lib/workAlt.test.ts
git commit -m "feat: add 24 work records, categories and generated alt text"
```

---

### Task 5: Gallery layout maths

**Files:**
- Create: `src/lib/galleryLayout.ts`
- Test: `src/lib/galleryLayout.test.ts`

**Interfaces:**
- Consumes: `Ratio`, `Work` from `@/data/works`; `CategoryId` from `@/data/categories`.
- Produces: `COLUMN_UNITS = 60`, `rowSpan(ratio: Ratio, columnUnits?: number): number`, `offsetFor(index: number, columns: number): Offset`, `type Offset = 'none' | 'left' | 'right'`, `filterWorks(works: Work[], category: CategoryId): Work[]`, `isEager(index: number): boolean`.

This is the interlocking mechanism. Pure and server-renderable — no measurement pass, so filtering never causes a reflow flash.

- [ ] **Step 1: Write the failing test**

Create `src/lib/galleryLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rowSpan, offsetFor, filterWorks, isEager, COLUMN_UNITS } from './galleryLayout'
import { WORKS } from '@/data/works'

describe('rowSpan', () => {
  it('gives taller spans to taller ratios', () => {
    expect(rowSpan('16:9')).toBeLessThan(rowSpan('3:2'))
    expect(rowSpan('3:2')).toBeLessThan(rowSpan('4:3'))
    expect(rowSpan('4:3')).toBeLessThan(rowSpan('4:5'))
  })

  it('computes span from the column unit width', () => {
    expect(rowSpan('3:2', 60)).toBe(40)
    expect(rowSpan('4:3', 60)).toBe(45)
    expect(rowSpan('16:9', 60)).toBe(34)
    expect(rowSpan('4:5', 60)).toBe(75)
  })

  it('returns whole numbers, since grid spans must be integers', () => {
    for (const r of ['3:2', '4:3', '16:9', '4:5'] as const) {
      expect(Number.isInteger(rowSpan(r))).toBe(true)
    }
  })

  it('defaults to COLUMN_UNITS', () => {
    expect(rowSpan('3:2')).toBe(rowSpan('3:2', COLUMN_UNITS))
  })
})

describe('offsetFor', () => {
  it('disables offsets on a single column, so mobile stays flush', () => {
    for (let i = 0; i < 8; i++) expect(offsetFor(i, 1)).toBe('none')
  })

  it('alternates left and right so the grid reads as woven', () => {
    expect(offsetFor(0, 3)).toBe('none')
    expect(offsetFor(1, 3)).toBe('left')
    expect(offsetFor(2, 3)).toBe('none')
    expect(offsetFor(3, 3)).toBe('right')
  })

  it('repeats on a period of four', () => {
    expect(offsetFor(5, 3)).toBe('left')
    expect(offsetFor(7, 3)).toBe('right')
  })

  it('never offsets more than half the items', () => {
    const offsets = Array.from({ length: 24 }, (_, i) => offsetFor(i, 3))
    expect(offsets.filter((o) => o !== 'none')).toHaveLength(12)
  })
})

describe('filterWorks', () => {
  it('returns everything for "all"', () => {
    expect(filterWorks(WORKS, 'all')).toHaveLength(24)
  })

  it('returns only the matching category', () => {
    const result = filterWorks(WORKS, 'wardrobe')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((w) => w.category === 'wardrobe')).toBe(true)
  })

  it('preserves source order', () => {
    const result = filterWorks(WORKS, 'kitchen')
    const ids = result.map((w) => w.id)
    expect([...ids].sort()).toEqual(ids)
  })

  it('does not mutate the source array', () => {
    filterWorks(WORKS, 'office')
    expect(WORKS).toHaveLength(24)
  })
})

describe('isEager', () => {
  it('eagerly loads the first eight only', () => {
    expect(isEager(0)).toBe(true)
    expect(isEager(7)).toBe(true)
    expect(isEager(8)).toBe(false)
    expect(isEager(23)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/galleryLayout.test.ts`
Expected: FAIL — cannot resolve `./galleryLayout`.

- [ ] **Step 3: Implement galleryLayout.ts**

Create `src/lib/galleryLayout.ts`:

```ts
import type { Ratio, Work } from '@/data/works'
import type { CategoryId } from '@/data/categories'

export const COLUMN_UNITS = 60
export const EAGER_COUNT = 8

const RATIO_VALUE: Record<Ratio, number> = {
  '3:2': 3 / 2,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '4:5': 4 / 5,
}

export function rowSpan(ratio: Ratio, columnUnits: number = COLUMN_UNITS): number {
  return Math.round(columnUnits / RATIO_VALUE[ratio])
}

export type Offset = 'none' | 'left' | 'right'

export function offsetFor(index: number, columns: number): Offset {
  if (columns < 2) return 'none'
  const phase = index % 4
  if (phase === 1) return 'left'
  if (phase === 3) return 'right'
  return 'none'
}

export function filterWorks(works: Work[], category: CategoryId): Work[] {
  return category === 'all' ? [...works] : works.filter((w) => w.category === category)
}

export function isEager(index: number): boolean {
  return index < EAGER_COUNT
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/galleryLayout.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/galleryLayout.ts src/lib/galleryLayout.test.ts
git commit -m "feat: add pure gallery interlock layout maths"
```

---

### Task 6: Lightbox navigation and film card sync

**Files:**
- Create: `src/lib/lightboxNav.ts`, `src/lib/filmCards.ts`
- Create: `src/data/specs.ts`
- Test: `src/lib/lightboxNav.test.ts`, `src/lib/filmCards.test.ts`

**Interfaces:**
- Consumes: `TBC`, `Maybe` from `@/lib/tbc`.
- Produces: `nextIndex(current: number, length: number): number`, `prevIndex(current: number, length: number): number`, `cardIndexAt(time: number, starts: number[]): number`, `FILM_CARDS`, `CLIP_STARTS`, `MATERIAL_SPECS`.

- [ ] **Step 1: Write the failing lightbox test**

Create `src/lib/lightboxNav.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nextIndex, prevIndex } from './lightboxNav'

describe('nextIndex', () => {
  it('advances', () => expect(nextIndex(0, 24)).toBe(1))
  it('wraps at the end', () => expect(nextIndex(23, 24)).toBe(0))
})

describe('prevIndex', () => {
  it('goes back', () => expect(prevIndex(5, 24)).toBe(4))
  it('wraps at the start', () => expect(prevIndex(0, 24)).toBe(23))
})

describe('edge cases', () => {
  it('stays put in a single-item gallery', () => {
    expect(nextIndex(0, 1)).toBe(0)
    expect(prevIndex(0, 1)).toBe(0)
  })
  it('returns 0 for an empty gallery rather than NaN', () => {
    expect(nextIndex(0, 0)).toBe(0)
    expect(prevIndex(0, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Write the failing film sync test**

Create `src/lib/filmCards.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cardIndexAt } from './filmCards'

const starts = [0, 4.5, 9.2, 13.8]

describe('cardIndexAt', () => {
  it('shows the first card from the start', () => {
    expect(cardIndexAt(0, starts)).toBe(0)
    expect(cardIndexAt(4.49, starts)).toBe(0)
  })

  it('switches exactly on the clip boundary', () => {
    expect(cardIndexAt(4.5, starts)).toBe(1)
    expect(cardIndexAt(9.2, starts)).toBe(2)
    expect(cardIndexAt(13.8, starts)).toBe(3)
  })

  it('holds the last card to the end of the file', () => {
    expect(cardIndexAt(18, starts)).toBe(3)
  })

  it('clamps negative or NaN time to the first card', () => {
    expect(cardIndexAt(-1, starts)).toBe(0)
    expect(cardIndexAt(NaN, starts)).toBe(0)
  })

  it('supports a three-cut film, if a figure is unknown and a row is dropped', () => {
    expect(cardIndexAt(11, [0, 5, 10])).toBe(2)
  })

  it('returns 0 when there are no clips', () => {
    expect(cardIndexAt(5, [])).toBe(0)
  })
})
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npx vitest run src/lib/lightboxNav.test.ts src/lib/filmCards.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement lightboxNav.ts**

```ts
export function nextIndex(current: number, length: number): number {
  if (length <= 0) return 0
  return (current + 1) % length
}

export function prevIndex(current: number, length: number): number {
  if (length <= 0) return 0
  return (current - 1 + length) % length
}
```

- [ ] **Step 5: Implement specs.ts and filmCards.ts**

Create `src/data/specs.ts`:

```ts
import { TBC, type Maybe } from '@/lib/tbc'

/**
 * Start timestamp in seconds of each clip inside the concatenated film.
 * Fill these from the actual encode before the film goes live.
 */
export const CLIP_STARTS: number[] = [0, 4.5, 9.2, 13.8]

export interface FilmCard {
  counter: string
  label: string
  /** Oversized yellow display figure. */
  figure: Maybe<string>
  /** One line beneath, in white. */
  line: Maybe<string>
}

/**
 * Invented specification is worse than none. If a figure stays unknown at launch,
 * DELETE that row and drop the matching clip so the film runs three cuts.
 */
export const FILM_CARDS: FilmCard[] = [
  { counter: '01', label: 'The measure', figure: TBC, line: 'Tolerance we work to on site.' },
  { counter: '02', label: 'The cut', figure: TBC, line: TBC },
  { counter: '03', label: 'The fit', figure: TBC, line: 'Hinge and runner rating.' },
  { counter: '04', label: 'The handover', figure: TBC, line: 'Measurement to installation, on average.' },
]

export interface MaterialSpec {
  /** Which detail shot this strip item uses. */
  slot: 'edge' | 'hinge' | 'fabric' | 'samples' | 'interior'
  label: string
  value: Maybe<string>
}

export const MATERIAL_SPECS: MaterialSpec[] = [
  { slot: 'edge', label: 'Board type and thickness', value: TBC },
  { slot: 'samples', label: 'Where we use moisture-resistant board', value: TBC },
  { slot: 'edge', label: 'Edge banding', value: TBC },
  { slot: 'hinge', label: 'Hinge and runner, with cycle rating', value: TBC },
  { slot: 'fabric', label: 'Upholstery fabric and foam density', value: TBC },
  { slot: 'interior', label: 'Warranty', value: TBC },
]
```

Create `src/lib/filmCards.ts`:

```ts
export function cardIndexAt(time: number, starts: number[]): number {
  if (starts.length === 0) return 0
  if (!Number.isFinite(time) || time < 0) return 0
  let index = 0
  for (let i = 0; i < starts.length; i++) {
    if (time >= starts[i]) index = i
  }
  return index
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/lightboxNav.test.ts src/lib/filmCards.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/lightboxNav.ts src/lib/lightboxNav.test.ts src/lib/filmCards.ts src/lib/filmCards.test.ts src/data/specs.ts
git commit -m "feat: add lightbox navigation and timeupdate-driven film card sync"
```

---

### Task 7: WhatsApp links and enquiry validation

**Files:**
- Create: `src/lib/whatsapp.ts`, `src/lib/enquirySchema.ts`
- Test: `src/lib/whatsapp.test.ts`, `src/lib/enquirySchema.test.ts`

**Interfaces:**
- Consumes: `Maybe`, `isTBC` from `@/lib/tbc`; `zod`.
- Produces: `whatsappUrl(number: Maybe<string>, message: string): string | null`, `enquirySchema`, `type Enquiry`, `NEED_OPTIONS`, `PROPERTY_TYPES`.

- [ ] **Step 1: Write the failing WhatsApp test**

Create `src/lib/whatsapp.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TBC } from './tbc'
import { whatsappUrl } from './whatsapp'

describe('whatsappUrl', () => {
  it('builds a wa.me link with an encoded message', () => {
    expect(whatsappUrl('94771234567', 'Hello, I need a wardrobe'))
      .toBe('https://wa.me/94771234567?text=Hello%2C%20I%20need%20a%20wardrobe')
  })

  it('strips spaces, plus signs and dashes from the number', () => {
    expect(whatsappUrl('+94 77 123-4567', 'Hi')).toBe('https://wa.me/94771234567?text=Hi')
  })

  it('returns null when the number is TBC, so no broken link renders', () => {
    expect(whatsappUrl(TBC, 'Hi')).toBeNull()
  })

  it('returns null for a number with no digits', () => {
    expect(whatsappUrl('---', 'Hi')).toBeNull()
  })
})
```

- [ ] **Step 2: Implement whatsapp.ts**

```ts
import { isTBC, type Maybe } from './tbc'

export function whatsappUrl(number: Maybe<string>, message: string): string | null {
  if (isTBC(number)) return null
  const digits = number.replace(/\D/g, '')
  if (digits.length === 0) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 3: Write the failing enquiry schema test**

Create `src/lib/enquirySchema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { enquirySchema } from './enquirySchema'

const valid = {
  name: 'Nimal',
  phone: '0771234567',
  email: 'nimal@example.lk',
  propertyType: 'apartment',
  needs: ['wardrobe'],
  dimensions: 'not sure yet',
  budget: '',
  source: 'instagram',
}

describe('enquirySchema', () => {
  it('accepts a complete enquiry', () => {
    expect(enquirySchema.safeParse(valid).success).toBe(true)
  })

  it('requires at least one need, since a blank enquiry is unactionable', () => {
    const r = enquirySchema.safeParse({ ...valid, needs: [] })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('Choose at least one thing you need')
    }
  })

  it('rejects a malformed email with a specific, non-apologising message', () => {
    const r = enquirySchema.safeParse({ ...valid, email: 'nimal@' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toBe('That email address is missing a domain')
    }
  })

  it('requires a phone number of at least nine digits', () => {
    expect(enquirySchema.safeParse({ ...valid, phone: '0771' }).success).toBe(false)
  })

  it('allows an empty budget, which is optional', () => {
    expect(enquirySchema.safeParse({ ...valid, budget: '' }).success).toBe(true)
  })

  it('rejects an unknown property type', () => {
    expect(enquirySchema.safeParse({ ...valid, propertyType: 'castle' }).success).toBe(false)
  })

  it('has no error message containing an exclamation mark or an apology', () => {
    const r = enquirySchema.safeParse({ name: '', phone: '', email: '', propertyType: 'x', needs: [] })
    if (!r.success) {
      for (const issue of r.error.issues) {
        expect(issue.message).not.toContain('!')
        expect(issue.message.toLowerCase()).not.toContain('sorry')
      }
    }
  })
})
```

- [ ] **Step 4: Implement enquirySchema.ts**

```ts
import { z } from 'zod'

export const PROPERTY_TYPES = ['house', 'apartment', 'hotel', 'office', 'other'] as const

export const NEED_OPTIONS = [
  { id: 'seating', label: 'Sofa & seating' },
  { id: 'kitchen', label: 'Kitchen / pantry' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'living', label: 'TV & storage' },
  { id: 'office', label: 'Office' },
  { id: 'other', label: 'Other' },
] as const

const NEED_IDS = NEED_OPTIONS.map((n) => n.id) as unknown as [string, ...string[]]

export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 9, 'Enter a phone number we can call back on'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email address')
    .refine((v) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v), 'That email address is missing a domain'),
  propertyType: z.enum(PROPERTY_TYPES, { message: 'Choose the property type' }),
  needs: z.array(z.enum(NEED_IDS)).min(1, 'Choose at least one thing you need'),
  dimensions: z.string().trim().optional().default(''),
  budget: z.string().trim().optional().default(''),
  source: z.string().trim().optional().default(''),
})

export type Enquiry = z.infer<typeof enquirySchema>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/whatsapp.test.ts src/lib/enquirySchema.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/whatsapp.ts src/lib/whatsapp.test.ts src/lib/enquirySchema.ts src/lib/enquirySchema.test.ts
git commit -m "feat: add WhatsApp link builder and shared enquiry validation"
```

---

### Task 8: Motion foundation

**Files:**
- Create: `src/hooks/useMotionLevel.ts`, `src/hooks/useCountUp.ts`
- Create: `src/components/chrome/SmoothScroll.tsx`, `src/components/chrome/CustomCursor.tsx`
- Create: `src/components/weave/WeaveReveal.tsx`
- Test: `src/hooks/useMotionLevel.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `useMotionLevel(): MotionLevel`, `type MotionLevel = 'full' | 'reduced' | 'mobile'`, `resolveMotionLevel(prefersReduced: boolean, width: number): MotionLevel`, `useCountUp(target, active)`, `<SmoothScroll>`, `<CustomCursor>`, `<WeaveReveal from="left"|"right">`.

The pure `resolveMotionLevel` is what gets tested; the hook is a thin wrapper over `matchMedia`.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useMotionLevel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { resolveMotionLevel, MOBILE_MAX } from './useMotionLevel'

describe('resolveMotionLevel', () => {
  it('returns reduced whenever the user asks for reduced motion, at any width', () => {
    expect(resolveMotionLevel(true, 1440)).toBe('reduced')
    expect(resolveMotionLevel(true, 375)).toBe('reduced')
  })

  it('returns mobile on small screens', () => {
    expect(resolveMotionLevel(false, 375)).toBe('mobile')
    expect(resolveMotionLevel(false, MOBILE_MAX)).toBe('mobile')
  })

  it('returns full on desktop', () => {
    expect(resolveMotionLevel(false, MOBILE_MAX + 1)).toBe('full')
    expect(resolveMotionLevel(false, 1440)).toBe('full')
  })

  it('treats reduced-motion as higher priority than viewport width', () => {
    expect(resolveMotionLevel(true, MOBILE_MAX + 1)).not.toBe('full')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useMotionLevel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement useMotionLevel.ts**

```ts
'use client'
import { useEffect, useState } from 'react'

export type MotionLevel = 'full' | 'reduced' | 'mobile'
export const MOBILE_MAX = 767

export function resolveMotionLevel(prefersReduced: boolean, width: number): MotionLevel {
  if (prefersReduced) return 'reduced'
  return width <= MOBILE_MAX ? 'mobile' : 'full'
}

export function useMotionLevel(): MotionLevel {
  // Server and first paint assume the most conservative setting.
  const [level, setLevel] = useState<MotionLevel>('reduced')

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setLevel(resolveMotionLevel(motionQuery.matches, window.innerWidth))
    update()
    motionQuery.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      motionQuery.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return level
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useMotionLevel.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Implement SmoothScroll**

Create `src/components/chrome/SmoothScroll.tsx`. Lenis and ScrollTrigger must share a ticker or pinning drifts.

```tsx
'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMotionLevel } from '@/hooks/useMotionLevel'

gsap.registerPlugin(ScrollTrigger)

export function SmoothScroll() {
  const level = useMotionLevel()

  useEffect(() => {
    if (level === 'reduced') return
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })

    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [level])

  return null
}
```

- [ ] **Step 6: Implement WeaveReveal**

Create `src/components/weave/WeaveReveal.tsx`. This is the signature motion: elements arrive alternately from left and right and settle into an interlocked position.

```tsx
'use client'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'

export function WeaveReveal({
  children,
  from = 'left',
  delay = 0,
  className,
}: {
  children: ReactNode
  from?: 'left' | 'right'
  delay?: number
  className?: string
}) {
  const level = useMotionLevel()

  if (level === 'reduced') return <div className={className}>{children}</div>

  const offset = level === 'mobile' ? 0 : from === 'left' ? -48 : 48

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.42,
        delay,
        ease: [0.22, 1.2, 0.36, 1], // decisive, slight overshoot
      }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 7: Implement CustomCursor**

Create `src/components/chrome/CustomCursor.tsx`. Desktop only, teal ring echoing the logo circle.

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null)
  const level = useMotionLevel()

  useEffect(() => {
    if (level !== 'full') return
    const el = ref.current
    if (!el) return

    const move = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
      const target = e.target as HTMLElement
      const label = target.closest('[data-cursor-label]')?.getAttribute('data-cursor-label')
      const interactive = target.closest('a, button, [role="button"], input, select, textarea')
      el.dataset.state = label ? 'label' : interactive ? 'grown' : 'default'
      el.textContent = label ?? ''
    }

    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [level])

  if (level !== 'full') return null

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-state="default"
      className="pointer-events-none fixed left-0 top-0 z-[100] flex items-center justify-center
                 rounded-full border border-teal text-navy u-mono
                 transition-[width,height,background-color] duration-200
                 data-[state=default]:h-6 data-[state=default]:w-6
                 data-[state=grown]:h-10 data-[state=grown]:w-10
                 data-[state=label]:h-auto data-[state=label]:w-auto
                 data-[state=label]:bg-yellow data-[state=label]:px-3 data-[state=label]:py-1"
    />
  )
}
```

- [ ] **Step 8: Implement useCountUp**

Create `src/hooks/useCountUp.ts`:

```ts
'use client'
import { useEffect, useState } from 'react'
import { useMotionLevel } from './useMotionLevel'

export function useCountUp(target: number, active: boolean, duration = 900): number {
  const level = useMotionLevel()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    if (level === 'reduced') {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, active, duration, level])

  return value
}
```

- [ ] **Step 9: Run the full suite and commit**

Run: `npx vitest run`
Expected: PASS, all tests green.

```bash
git add src/hooks src/components/chrome src/components/weave
git commit -m "feat: add motion level foundation, weave reveal, smooth scroll and cursor"
```

---

### Task 9: Gallery grid, cards and filter row — priority 1

**Files:**
- Create: `src/components/gallery/GalleryCard.tsx`, `src/components/gallery/FilterRow.tsx`, `src/components/gallery/GalleryGrid.tsx`
- Test: `src/components/gallery/GalleryGrid.test.tsx`

**Interfaces:**
- Consumes: `filterWorks`, `rowSpan`, `offsetFor`, `isEager`, `COLUMN_UNITS` from `@/lib/galleryLayout`; `workAlt`; `WORKS`, `CATEGORIES`.
- Produces: `<GalleryGrid onOpen={(index: number) => void} />`, `<FilterRow active onChange />`, `<GalleryCard work index columns onOpen />`.

Hover dims the rest of the grid through a single grid-level `data-hovered` attribute — one state change, not 24 listeners.

- [ ] **Step 1: Write the failing test**

Create `src/components/gallery/GalleryGrid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GalleryGrid } from './GalleryGrid'

describe('GalleryGrid', () => {
  it('renders all 24 works by default', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    expect(screen.getAllByRole('img')).toHaveLength(24)
  })

  it('gives every image real alt text with no placeholder', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    for (const img of screen.getAllByRole('img')) {
      expect(img).toHaveAccessibleName()
      expect(img.getAttribute('alt')).not.toContain('[TBC]')
    }
  })

  it('lazy-loads everything past the first eight', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const imgs = screen.getAllByRole('img')
    expect(imgs[0]).toHaveAttribute('loading', 'eager')
    expect(imgs[7]).toHaveAttribute('loading', 'eager')
    expect(imgs[8]).toHaveAttribute('loading', 'lazy')
  })

  it('filters to a single category when a chip is chosen', async () => {
    const user = userEvent.setup()
    render(<GalleryGrid onOpen={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Wardrobes' }))
    const count = screen.getAllByRole('img').length
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(24)
  })

  it('marks the active filter chip for assistive tech', async () => {
    const user = userEvent.setup()
    render(<GalleryGrid onOpen={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Wardrobes' }))
    expect(screen.getByRole('button', { name: 'Wardrobes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('opens the lightbox at the clicked index', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<GalleryGrid onOpen={onOpen} />)
    await user.click(screen.getAllByRole('button', { name: /Built-in wardrobe/ })[0])
    expect(onOpen).toHaveBeenCalledWith(0)
  })

  it('exposes each card as a keyboard-reachable button', () => {
    render(<GalleryGrid onOpen={vi.fn()} />)
    const grid = screen.getByTestId('gallery-grid')
    expect(within(grid).getAllByRole('button')).toHaveLength(24)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/gallery/GalleryGrid.test.tsx`
Expected: FAIL — cannot resolve `./GalleryGrid`.

- [ ] **Step 3: Implement FilterRow**

Create `src/components/gallery/FilterRow.tsx`:

```tsx
'use client'
import { CATEGORIES, type CategoryId } from '@/data/categories'

export function FilterRow({
  active,
  onChange,
}: {
  active: CategoryId
  onChange: (id: CategoryId) => void
}) {
  return (
    <div role="group" aria-label="Filter work by category" className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const isActive = c.id === active
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(c.id)}
            className={`u-mono rounded-full px-4 py-2 transition-colors duration-200 ${
              isActive
                ? 'bg-yellow text-navy'
                : 'border border-teal/40 text-sky hover:border-teal'
            }`}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Implement GalleryCard**

Create `src/components/gallery/GalleryCard.tsx`:

```tsx
'use client'
import Image from 'next/image'
import { isEager } from '@/lib/galleryLayout'
import { workAlt } from '@/lib/workAlt'
import { isTBC } from '@/lib/tbc'
import type { Work } from '@/data/works'

export function GalleryCard({
  work,
  index,
  onOpen,
}: {
  work: Work
  index: number
  onOpen: (index: number) => void
}) {
  const caption = [work.title, work.materials, work.district]
    .filter((p) => p !== undefined && !isTBC(p))
    .join(' · ')

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      data-cursor-label="View"
      className="group absolute inset-0 block overflow-hidden text-left transition-opacity
                 duration-300 group-data-[hovered=true]/grid:opacity-40 hover:!opacity-100"
    >
      <Image
        src={work.image}
        alt={workAlt(work)}
        fill
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
        loading={isEager(index) ? 'eager' : 'lazy'}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-navy/90 p-4
                   transition-transform duration-300 group-hover:translate-y-0"
      >
        <span className="u-mono block text-sky">{caption}</span>
        <span className="mt-2 block h-px w-full bg-teal" />
      </span>
    </button>
  )
}
```

> **Note on `fill`:** each card is a positioned grid item with a fixed row span, so `fill` has a sized container. Add `relative` to the button — it is already there.

- [ ] **Step 5: Implement GalleryGrid**

Create `src/components/gallery/GalleryGrid.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WORKS } from '@/data/works'
import type { CategoryId } from '@/data/categories'
import { filterWorks, rowSpan, offsetFor } from '@/lib/galleryLayout'
import { useMotionLevel } from '@/hooks/useMotionLevel'
import { FilterRow } from './FilterRow'
import { GalleryCard } from './GalleryCard'

const OFFSET_CLASS = {
  none: '',
  left: 'lg:-translate-x-6',
  right: 'lg:translate-x-6',
} as const

export function GalleryGrid({ onOpen }: { onOpen: (index: number) => void }) {
  const [active, setActive] = useState<CategoryId>('all')
  const [hovered, setHovered] = useState(false)
  const level = useMotionLevel()

  const visible = filterWorks(WORKS, active)
  const columns = level === 'mobile' ? 1 : 3
  const stagger = level === 'reduced' ? 0 : 0.025

  return (
    <div>
      <FilterRow active={active} onChange={setActive} />

      <motion.div
        layout={level === 'full'}
        data-testid="gallery-grid"
        data-hovered={hovered}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className="group/grid mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        style={{ gridAutoRows: '8px' }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map((work, i) => (
            // This motion element IS the grid item: it carries the row span and the
            // interlock offset. Framer Motion cannot measure a `display: contents`
            // element, so wrapping the card in one would silently kill layout animation.
            <motion.div
              key={work.id}
              layout={level === 'full'}
              initial={{ opacity: 0, x: level === 'full' ? (i % 2 ? 32 : -32) : 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: i * stagger, ease: [0.22, 1.2, 0.36, 1] }}
              style={{ gridRowEnd: `span ${rowSpan(work.ratio)}` }}
              className={`relative ${OFFSET_CLASS[offsetFor(i, columns)]}`}
            >
              <GalleryCard
                work={work}
                index={WORKS.indexOf(work)}
                onOpen={onOpen}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/gallery/GalleryGrid.test.tsx`
Expected: PASS, 7 tests.

If `next/image` complains in jsdom, add to `vitest.setup.ts`:

```ts
import { vi } from 'vitest'
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props as { fill?: boolean }
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />
  },
}))
```

Rename `vitest.setup.ts` to `vitest.setup.tsx` and update `vitest.config.ts` accordingly.

- [ ] **Step 7: Commit**

```bash
git add src/components/gallery vitest.setup.tsx vitest.config.ts
git commit -m "feat: add interlocking gallery grid with filtering and lazy loading"
```

---

### Task 10: Before/after compare slider

**Files:**
- Create: `src/components/gallery/BeforeAfterSlider.tsx`
- Create: `src/lib/clamp.ts`
- Test: `src/lib/clamp.test.ts`, `src/components/gallery/BeforeAfterSlider.test.tsx`

**Interfaces:**
- Consumes: `workAlt`, `Work`.
- Produces: `clampPercent(value: number): number`, `<BeforeAfterSlider work={work} />`.

For fitted furniture this is the most persuasive element on the page: bare wall on one side, finished unit on the other.

- [ ] **Step 1: Write the failing clamp test**

Create `src/lib/clamp.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { clampPercent } from './clamp'

describe('clampPercent', () => {
  it('passes through values in range', () => expect(clampPercent(42)).toBe(42))
  it('clamps below zero', () => expect(clampPercent(-10)).toBe(0))
  it('clamps above one hundred', () => expect(clampPercent(140)).toBe(100))
  it('handles the exact bounds', () => {
    expect(clampPercent(0)).toBe(0)
    expect(clampPercent(100)).toBe(100)
  })
  it('returns 50 for NaN rather than breaking the layout', () => {
    expect(clampPercent(NaN)).toBe(50)
  })
})
```

- [ ] **Step 2: Implement clamp.ts**

```ts
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, value))
}
```

- [ ] **Step 3: Write the failing slider test**

Create `src/components/gallery/BeforeAfterSlider.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeforeAfterSlider } from './BeforeAfterSlider'
import { WORKS } from '@/data/works'

const withBefore = WORKS.find((w) => w.beforeImage)!
const withoutBefore = WORKS.find((w) => !w.beforeImage)!

describe('BeforeAfterSlider', () => {
  it('renders both images when a before shot exists', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('falls back to the single image when there is no before shot', () => {
    render(<BeforeAfterSlider work={withoutBefore} />)
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('exposes a labelled slider starting at the midpoint', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
    expect(slider).toHaveAccessibleName(/compare/i)
  })

  it('moves with the arrow keys, so it is usable without a pointer', async () => {
    const user = userEvent.setup()
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowRight}')
    expect(slider).toHaveAttribute('aria-valuenow', '52')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(slider).toHaveAttribute('aria-valuenow', '48')
  })

  it('clamps at the ends rather than wrapping', async () => {
    const user = userEvent.setup()
    render(<BeforeAfterSlider work={withBefore} />)
    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{Home}')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    await user.keyboard('{ArrowLeft}')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
  })

  it('describes the before image as the bare wall', () => {
    render(<BeforeAfterSlider work={withBefore} />)
    expect(screen.getByAltText(/before installation/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Implement BeforeAfterSlider**

```tsx
'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { clampPercent } from '@/lib/clamp'
import { workAlt } from '@/lib/workAlt'
import type { Work } from '@/data/works'

export function BeforeAfterSlider({ work }: { work: Work }) {
  const [percent, setPercent] = useState(50)
  const frameRef = useRef<HTMLDivElement>(null)

  if (!work.beforeImage) {
    return (
      <div className="relative aspect-[3/2] w-full">
        <Image src={work.image} alt={workAlt(work)} fill sizes="90vw" className="object-cover" />
      </div>
    )
  }

  const setFromClientX = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    setPercent(clampPercent(((clientX - rect.left) / rect.width) * 100))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowRight') setPercent((p) => clampPercent(p + step))
    else if (e.key === 'ArrowLeft') setPercent((p) => clampPercent(p - step))
    else if (e.key === 'Home') setPercent(0)
    else if (e.key === 'End') setPercent(100)
    else return
    e.preventDefault()
  }

  return (
    <div
      ref={frameRef}
      className="relative aspect-[3/2] w-full select-none overflow-hidden"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setFromClientX(e.clientX)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientX(e.clientX)
      }}
    >
      <Image
        src={work.beforeImage}
        alt={`${work.title} before installation, bare wall`}
        fill
        sizes="90vw"
        className="object-cover"
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${percent}%)` }}>
        <Image src={work.image} alt={workAlt(work)} fill sizes="90vw" className="object-cover" />
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare before and after installation"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 z-10 w-1 -translate-x-1/2 cursor-ew-resize bg-yellow"
        style={{ left: `${percent}%` }}
      >
        <span className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow bg-navy" />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/clamp.test.ts src/components/gallery/BeforeAfterSlider.test.tsx`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/clamp.ts src/lib/clamp.test.ts src/components/gallery/BeforeAfterSlider.tsx src/components/gallery/BeforeAfterSlider.test.tsx
git commit -m "feat: add drag-to-compare before/after slider with keyboard support"
```

---

### Task 11: Lightbox

**Files:**
- Create: `src/components/gallery/Lightbox.tsx`
- Create: `src/context/EnquiryPrefill.tsx`
- Test: `src/components/gallery/Lightbox.test.tsx`

**Interfaces:**
- Consumes: `nextIndex`, `prevIndex`, `WORKS`, `BeforeAfterSlider`, `isTBC`.
- Produces: `<Lightbox index onClose onIndexChange />`, `EnquiryPrefillProvider`, `useEnquiryPrefill(): { needs: string[]; prefill: (need: string) => void }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/gallery/Lightbox.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Lightbox } from './Lightbox'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'
import { WORKS } from '@/data/works'

function setup(index = 0) {
  const onClose = vi.fn()
  const onIndexChange = vi.fn()
  render(
    <EnquiryPrefillProvider>
      <Lightbox index={index} onClose={onClose} onIndexChange={onIndexChange} />
    </EnquiryPrefillProvider>,
  )
  return { onClose, onIndexChange }
}

describe('Lightbox', () => {
  it('renders as a modal dialog with an accessible name', () => {
    setup()
    expect(screen.getByRole('dialog')).toHaveAccessibleName(WORKS[0].title)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('advances with the right arrow key', async () => {
    const user = userEvent.setup()
    const { onIndexChange } = setup(0)
    await user.keyboard('{ArrowRight}')
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  it('wraps backwards from the first item', async () => {
    const user = userEvent.setup()
    const { onIndexChange } = setup(0)
    await user.keyboard('{ArrowLeft}')
    expect(onIndexChange).toHaveBeenCalledWith(WORKS.length - 1)
  })

  it('shows the compare slider only for works that have a before image', () => {
    setup(0)
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('falls back cleanly for works without a before image', () => {
    const plain = WORKS.findIndex((w) => !w.beforeImage)
    setup(plain)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
  })

  it('omits spec rows whose value is unknown, instead of printing the placeholder', () => {
    setup(0)
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
  })

  it('offers a single yellow enquire action', () => {
    setup(0)
    expect(
      screen.getByRole('button', { name: /Enquire about something like this/i }),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement the prefill context**

Create `src/context/EnquiryPrefill.tsx`:

```tsx
'use client'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface PrefillValue {
  needs: string[]
  prefill: (need: string) => void
}

const Ctx = createContext<PrefillValue>({ needs: [], prefill: () => {} })

export function EnquiryPrefillProvider({ children }: { children: React.ReactNode }) {
  const [needs, setNeeds] = useState<string[]>([])

  const prefill = useCallback((need: string) => {
    setNeeds((current) => (current.includes(need) ? current : [...current, need]))
    document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const value = useMemo(() => ({ needs, prefill }), [needs, prefill])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEnquiryPrefill(): PrefillValue {
  return useContext(Ctx)
}
```

- [ ] **Step 3: Implement Lightbox**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { WORKS } from '@/data/works'
import { nextIndex, prevIndex } from '@/lib/lightboxNav'
import { isTBC } from '@/lib/tbc'
import { useEnquiryPrefill } from '@/context/EnquiryPrefill'
import { BeforeAfterSlider } from './BeforeAfterSlider'

export function Lightbox({
  index,
  onClose,
  onIndexChange,
}: {
  index: number
  onClose: () => void
  onIndexChange: (next: number) => void
}) {
  const work = WORKS[index]
  const dialogRef = useRef<HTMLDivElement>(null)
  const { prefill } = useEnquiryPrefill()

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onIndexChange(nextIndex(index, WORKS.length))
      else if (e.key === 'ArrowLeft') onIndexChange(prevIndex(index, WORKS.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onClose, onIndexChange])

  const specs: Array<[string, unknown]> = [
    ['Project type', work.title],
    ['Materials and finish', work.materials],
    ['Dimensions', work.dimensions],
    ['Hardware', work.hardware],
    ['Property type', work.propertyType],
    ['District', work.district],
    ['Year', work.year],
  ]

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={work.title}
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-y-auto bg-[#010F18]/97 p-6 lg:p-12"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="u-mono absolute right-6 top-6 text-sky"
      >
        Close
      </button>

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[2fr_1fr]">
        <BeforeAfterSlider work={work} />

        <div>
          <h2 className="font-display text-3xl text-white">{work.title}</h2>
          <dl className="mt-6 space-y-3">
            {specs.map(([label, value]) =>
              isTBC(value) || value === undefined ? null : (
                <div key={label} className="border-b border-teal/30 pb-2">
                  <dt className="u-mono text-sky">{label}</dt>
                  <dd className="mt-1 text-white">{String(value)}</dd>
                </div>
              ),
            )}
          </dl>

          <button
            type="button"
            onClick={() => {
              prefill(work.category)
              onClose()
            }}
            className="mt-8 w-full bg-yellow px-6 py-4 font-display text-navy"
          >
            Enquire about something like this
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl justify-between">
        <button
          type="button"
          onClick={() => onIndexChange(prevIndex(index, WORKS.length))}
          className="u-mono text-sky"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onIndexChange(nextIndex(index, WORKS.length))}
          className="u-mono text-sky"
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/gallery/Lightbox.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/gallery/Lightbox.tsx src/components/gallery/Lightbox.test.tsx src/context
git commit -m "feat: add lightbox with spec block, compare slider and enquiry prefill"
```

---

### Task 12: The film section — priority 2

**Files:**
- Create: `src/components/sections/Film.tsx`
- Test: `src/components/sections/Film.test.tsx`

**Interfaces:**
- Consumes: `cardIndexAt`, `CLIP_STARTS`, `FILM_CARDS`, `isTBC`, `useMotionLevel`.
- Produces: `<Film />`.

**Two rules that must not be broken:**
1. Cards switch from the video's own `timeupdate`. `currentTime` is read, **never assigned**.
2. Scroll drives the frame around the video, never the footage inside it.

- [ ] **Step 1: Write the failing test**

Create `src/components/sections/Film.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Film } from './Film'
import { FILM_CARDS } from '@/data/specs'

function fireTimeUpdate(video: HTMLVideoElement, time: number) {
  Object.defineProperty(video, 'currentTime', { value: time, configurable: true })
  act(() => {
    video.dispatchEvent(new Event('timeupdate'))
  })
}

describe('Film', () => {
  it('renders the first card before playback starts', () => {
    render(<Film />)
    expect(screen.getByTestId('film-card-counter')).toHaveTextContent(FILM_CARDS[0].counter)
  })

  it('switches cards from the video timeupdate event', () => {
    render(<Film />)
    const video = screen.getByTestId('film-video') as HTMLVideoElement
    fireTimeUpdate(video, 9.5)
    expect(screen.getByTestId('film-card-counter')).toHaveTextContent('03')
  })

  it('holds the last card to the end of the file', () => {
    render(<Film />)
    const video = screen.getByTestId('film-video') as HTMLVideoElement
    fireTimeUpdate(video, 60)
    expect(screen.getByTestId('film-card-counter')).toHaveTextContent(
      FILM_CARDS[FILM_CARDS.length - 1].counter,
    )
  })

  it('never assigns to currentTime', () => {
    render(<Film />)
    const video = screen.getByTestId('film-video') as HTMLVideoElement
    const setter = vi.fn()
    Object.defineProperty(video, 'currentTime', { set: setter, get: () => 0, configurable: true })
    act(() => video.dispatchEvent(new Event('timeupdate')))
    expect(setter).not.toHaveBeenCalled()
  })

  it('is muted, looping and inline so it can autoplay', () => {
    render(<Film />)
    const video = screen.getByTestId('film-video') as HTMLVideoElement
    // React sets these as DOM properties, not attributes — assert the properties.
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video.getAttribute('playsinline')).not.toBeNull()
  })

  it('omits a card figure that is still unknown rather than printing the placeholder', () => {
    render(<Film />)
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
  })

  it('splits the headline above and below the frame so type never overlaps footage', () => {
    render(<Film />)
    expect(screen.getByTestId('film-headline-top')).toBeInTheDocument()
    expect(screen.getByTestId('film-headline-bottom')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/sections/Film.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Film**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CLIP_STARTS, FILM_CARDS } from '@/data/specs'
import { cardIndexAt } from '@/lib/filmCards'
import { isTBC } from '@/lib/tbc'
import { useMotionLevel } from '@/hooks/useMotionLevel'

const FILM_SRC = '/film/roomy-process.mp4'
const FILM_POSTER = '/film/roomy-process-poster.jpg'

export function Film() {
  const [card, setCard] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const level = useMotionLevel()

  // Card sync — driven only by the video's own clock.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = () => setCard(cardIndexAt(video.currentTime, CLIP_STARTS))
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [])

  // Frame expansion — scroll drives the frame, never the footage.
  useEffect(() => {
    if (level !== 'full') return
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: false,
          toggleActions: 'play none none reverse',
        },
      })
      tl.to(frameRef.current, {
        scale: 1,
        duration: 0.45,
        ease: 'back.out(1.4)', // fast scale-up with slight overshoot
      })
        .to('[data-testid="film-headline-top"]', { y: '-40vh', duration: 0.45 }, 0)
        .to('[data-testid="film-headline-bottom"]', { y: '40vh', duration: 0.45 }, 0)
        .to('[data-film-line]', { scaleX: 1, duration: 0.45 }, 0)
    }, sectionRef)
    return () => ctx.revert()
  }, [level])

  const active = FILM_CARDS[card]

  return (
    <section ref={sectionRef} className="relative min-h-screen overflow-hidden bg-navy py-24">
      <h2
        data-testid="film-headline-top"
        className="text-center font-display text-4xl tracking-tight text-white lg:text-6xl"
      >
        Measured on site.
      </h2>

      <div
        ref={frameRef}
        className="relative mx-auto my-10 aspect-video w-[70%] origin-center scale-[0.85]"
      >
        <video
          ref={videoRef}
          data-testid="film-video"
          className="h-full w-full object-cover"
          src={FILM_SRC}
          poster={FILM_POSTER}
          muted
          loop
          playsInline
          autoPlay={level !== 'reduced' && level !== 'mobile'}
          controls={level === 'mobile'}
          preload="none"
        />

        <div className="absolute bottom-6 left-6 max-w-xs border border-teal bg-navy/95 p-5">
          <span data-testid="film-card-counter" className="font-display text-yellow">
            {active.counter} / {String(FILM_CARDS.length).padStart(2, '0')}
          </span>
          <span className="u-mono mt-2 block text-sky">{active.label}</span>
          {!isTBC(active.figure) && (
            <span className="mt-2 block font-display text-4xl text-yellow">{active.figure}</span>
          )}
          {!isTBC(active.line) && <p className="mt-2 text-white">{active.line}</p>}
        </div>

        <span data-film-line className="absolute -bottom-6 left-0 h-px w-full origin-left scale-x-0 bg-teal" />
      </div>

      {/* Second half of the split headline. A <p>, not an <h2> — the section already
          has its heading above, and one section should not carry two headings. */}
      <p
        data-testid="film-headline-bottom"
        className="text-center font-display text-4xl tracking-tight text-white lg:text-6xl"
      >
        Installed to the millimetre.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/sections/Film.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Create the video slot placeholder**

```bash
mkdir -p public/film
printf 'Drop roomy-process.mp4 and roomy-process-poster.jpg here. See README.\n' > public/film/README.txt
```

The section renders the poster with card 01 static when the file is absent. No fake timer.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Film.tsx src/components/sections/Film.test.tsx public/film
git commit -m "feat: add pinned film section with timeupdate-driven data cards"
```

---

### Task 13: Enquiry section and API route

**Files:**
- Create: `src/components/sections/Enquiry.tsx`, `src/components/sections/QuoteForm.tsx`
- Create: `src/app/api/enquiry/route.ts`, `.env.example`
- Test: `src/components/sections/QuoteForm.test.tsx`, `src/app/api/enquiry/route.test.ts`

**Interfaces:**
- Consumes: `enquirySchema`, `NEED_OPTIONS`, `PROPERTY_TYPES`, `whatsappUrl`, `SITE`, `useEnquiryPrefill`, `isTBC`.
- Produces: `<Enquiry />`, `POST` handler.

- [ ] **Step 1: Write the failing form test**

Create `src/components/sections/QuoteForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteForm } from './QuoteForm'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'

function renderForm() {
  render(
    <EnquiryPrefillProvider>
      <QuoteForm />
    </EnquiryPrefillProvider>,
  )
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), 'Nimal')
  await user.type(screen.getByLabelText(/phone/i), '0771234567')
  await user.type(screen.getByLabelText(/email/i), 'nimal@example.lk')
  await user.selectOptions(screen.getByLabelText(/property type/i), 'apartment')
  await user.click(screen.getByRole('checkbox', { name: /Wardrobe/i }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }))
})

describe('QuoteForm', () => {
  it('says exactly what the button does', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeInTheDocument()
  })

  it('states the response time explicitly', () => {
    renderForm()
    expect(screen.getByText(/We reply within one working day/i)).toBeInTheDocument()
  })

  it('shows a specific error when a required field is empty', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(await screen.findByText('Enter your name')).toBeInTheDocument()
  })

  it('does not submit when validation fails', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits a valid enquiry and shows a real success state', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/enquiry', expect.anything()))
    expect(await screen.findByRole('status')).toHaveTextContent(/we have your enquiry/i)
  })

  it('reports a failed send without apologising', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const user = userEvent.setup()
    renderForm()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent?.toLowerCase()).not.toContain('sorry')
    expect(alert.textContent).not.toContain('!')
  })

  it('has no CAPTCHA', () => {
    renderForm()
    expect(document.querySelector('[class*="captcha" i]')).toBeNull()
  })
})
```

- [ ] **Step 2: Implement QuoteForm**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { enquirySchema, NEED_OPTIONS, PROPERTY_TYPES } from '@/lib/enquirySchema'
import { useEnquiryPrefill } from '@/context/EnquiryPrefill'
import { SITE } from '@/data/site'
import { isTBC } from '@/lib/tbc'

type Errors = Record<string, string>

export function QuoteForm() {
  const { needs: prefilled } = useEnquiryPrefill()
  const [needs, setNeeds] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  useEffect(() => {
    if (prefilled.length) setNeeds((c) => [...new Set([...c, ...prefilled])])
  }, [prefilled])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const parsed = enquirySchema.safeParse({ ...data, needs })

    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message
      setErrors(next)
      return
    }

    setErrors({})
    setState('sending')
    const res = await fetch('/api/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
    setState(res.ok ? 'sent' : 'failed')
  }

  if (state === 'sent') {
    return (
      <div role="status" className="border-2 border-navy p-8">
        <h3 className="font-display text-2xl text-navy">We have your enquiry</h3>
        <p className="mt-3 text-navy">
          We reply within one working day. If it is urgent, message us on WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="on-paper space-y-5 text-navy">
      <Field id="name" label="Name" error={errors.name} />
      <Field id="phone" label="Phone" type="tel" error={errors.phone} />
      <Field id="email" label="Email" type="email" error={errors.email} />

      <div>
        <label htmlFor="propertyType" className="u-mono block">Property type</label>
        <select id="propertyType" name="propertyType" defaultValue=""
                className="mt-2 w-full border border-navy bg-transparent p-3">
          <option value="" disabled>Choose one</option>
          {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {errors.propertyType && <p className="u-mono mt-1 text-navy">{errors.propertyType}</p>}
      </div>

      <fieldset>
        <legend className="u-mono">What you need</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {NEED_OPTIONS.map((n) => (
            <label key={n.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="needs"
                value={n.id}
                checked={needs.includes(n.id)}
                onChange={(e) =>
                  setNeeds((c) => e.target.checked ? [...c, n.id] : c.filter((x) => x !== n.id))
                }
              />
              {n.label}
            </label>
          ))}
        </div>
        {errors.needs && <p className="u-mono mt-1 text-navy">{errors.needs}</p>}
      </fieldset>

      <Field id="dimensions" label="Rough room dimensions, or 'not sure yet'" />
      <Field id="budget" label="Budget range (optional)" />
      <Field id="source" label="How you found us" />

      {state === 'failed' && (
        <p role="alert" className="u-mono border border-navy p-3">
          That did not send. Check your connection and try again, or message us on WhatsApp.
        </p>
      )}

      <button type="submit" disabled={state === 'sending'}
              className="w-full bg-yellow px-6 py-4 font-display text-navy">
        {state === 'sending' ? 'Sending' : 'Send enquiry'}
      </button>

      <p className="u-mono">We reply within one working day.</p>
      {SITE.freeMeasurementVisit === true && (
        <p className="u-mono">Measurement visits are free and carry no obligation.</p>
      )}
    </form>
  )
}

function Field({ id, label, type = 'text', error }: {
  id: string; label: string; type?: string; error?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="u-mono block">{label}</label>
      <input id={id} name={id} type={type}
             aria-invalid={error ? true : undefined}
             className="mt-2 w-full border border-navy bg-transparent p-3" />
      {error && <p className="u-mono mt-1 text-navy">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Write the failing route test**

Create `src/app/api/enquiry/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const send = vi.fn()
vi.mock('resend', () => ({
  Resend: class { emails = { send } },
}))

const valid = {
  name: 'Nimal', phone: '0771234567', email: 'nimal@example.lk',
  propertyType: 'apartment', needs: ['wardrobe'], dimensions: '', budget: '', source: '',
}

function post(body: unknown) {
  return new Request('http://localhost/api/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  send.mockReset().mockResolvedValue({ data: { id: 'x' }, error: null })
  vi.stubEnv('RESEND_API_KEY', 'test-key')
  vi.stubEnv('ENQUIRY_TO_EMAIL', 'owner@example.lk')
})

describe('POST /api/enquiry', () => {
  it('rejects an invalid payload with 400 and does not send mail', async () => {
    const { POST } = await import('./route')
    const res = await POST(post({ ...valid, needs: [] }))
    expect(res.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it('sends the enquiry and returns 200', async () => {
    const { POST } = await import('./route')
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('returns 502 when the mail provider fails', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'nope' } })
    const { POST } = await import('./route')
    expect((await POST(post(valid))).status).toBe(502)
  })

  it('re-validates server side rather than trusting the client', async () => {
    const { POST } = await import('./route')
    expect((await POST(post({ name: 'x' }))).status).toBe(400)
  })
})
```

- [ ] **Step 4: Implement the route**

Create `src/app/api/enquiry/route.ts`:

```ts
import { Resend } from 'resend'
import { enquirySchema } from '@/lib/enquirySchema'

export async function POST(request: Request) {
  const parsed = enquirySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ ok: false, issues: parsed.error.issues }, { status: 400 })
  }

  const e = parsed.data
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'Roomy Creations site <enquiries@roomycreations.lk>',
    to: [process.env.ENQUIRY_TO_EMAIL ?? ''],
    replyTo: e.email,
    subject: `Quotation request — ${e.name}, ${e.propertyType}`,
    text: [
      `Name: ${e.name}`,
      `Phone: ${e.phone}`,
      `Email: ${e.email}`,
      `Property: ${e.propertyType}`,
      `Needs: ${e.needs.join(', ')}`,
      `Dimensions: ${e.dimensions || '—'}`,
      `Budget: ${e.budget || '—'}`,
      `Found us via: ${e.source || '—'}`,
    ].join('\n'),
  })

  if (error) return Response.json({ ok: false }, { status: 502 })
  return Response.json({ ok: true })
}
```

Create `.env.example`:

```
# Resend API key — https://resend.com/api-keys
RESEND_API_KEY=
# Where quotation requests are delivered
ENQUIRY_TO_EMAIL=
```

- [ ] **Step 5: Implement the Enquiry section wrapper**

Create `src/components/sections/Enquiry.tsx` with the three paths side by side on desktop, stacked on mobile: `<QuoteForm />`, a site-measurement/showroom block with a date-and-time preference field plus address and hours from `SITE`, and a WhatsApp block using `whatsappUrl(SITE.whatsappNumber, 'Hello Roomy Creations, I would like a quotation for ')` with the Facebook / Instagram / TikTok row. Render the WhatsApp button only when `whatsappUrl` returns non-null. Section ground is Paper, wrapped in `.on-paper`, `id="enquiry"`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/sections/QuoteForm.test.tsx src/app/api/enquiry/route.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections src/app/api .env.example
git commit -m "feat: add enquiry form, validation and Resend route handler"
```

---

### Task 14: Weave graphics, logo slot and remaining navy sections

**Files:**
- Create: `src/components/weave/WeaveDivider.tsx`, `src/components/weave/WeaveTexture.tsx`
- Create: `src/assets/logo.svg`, `src/assets/logo-navy.svg`, `src/components/chrome/Logo.tsx`
- Create: `src/components/sections/Hero.tsx`, `Position.tsx`, `Figures.tsx`, `WhatWeMake.tsx`, `HowWeWork.tsx`, `Materials.tsx`
- Test: `src/components/sections/Figures.test.tsx`, `src/components/sections/Materials.test.tsx`

**Interfaces:**
- Consumes: `SITE`, `MATERIAL_SPECS`, `useCountUp`, `WeaveReveal`, `isTBC`.
- Produces: the six section components plus `<WeaveDivider />`, `<WeaveTexture />`, `<Logo variant="yellow"|"navy" />`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/sections/Figures.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Figures } from './Figures'

describe('Figures', () => {
  it('renders a label for each of the four figures', () => {
    render(<Figures />)
    expect(screen.getByText(/years in business/i)).toBeInTheDocument()
    expect(screen.getByText(/homes and apartments fitted/i)).toBeInTheDocument()
    expect(screen.getByText(/units delivered/i)).toBeInTheDocument()
    expect(screen.getByText(/districts/i)).toBeInTheDocument()
  })

  it('shows a dash instead of the placeholder while the number is unknown', () => {
    render(<Figures />)
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(4)
  })
})
```

Create `src/components/sections/Materials.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Materials } from './Materials'
import { MATERIAL_SPECS } from '@/data/specs'

describe('Materials', () => {
  it('lists every specification label', () => {
    render(<Materials />)
    for (const spec of MATERIAL_SPECS) {
      expect(screen.getByText(spec.label)).toBeInTheDocument()
    }
  })

  it('never prints the TBC placeholder', () => {
    render(<Materials />)
    expect(screen.queryByText(/\[TBC\]/)).not.toBeInTheDocument()
  })

  it('makes the engineered board argument without apologising', () => {
    render(<Materials />)
    const text = screen.getByTestId('board-argument').textContent ?? ''
    expect(text).not.toMatch(/sorry|unfortunately|just as good|cheap alternative/i)
    expect(text).not.toContain('!')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/sections/Figures.test.tsx src/components/sections/Materials.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement Figures**

```tsx
'use client'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { SITE } from '@/data/site'
import { isTBC } from '@/lib/tbc'
import { useCountUp } from '@/hooks/useCountUp'

const ROWS = [
  ['yearsInBusiness', 'Years in business'],
  ['homesFitted', 'Homes and apartments fitted'],
  ['unitsDelivered', 'Units delivered'],
  ['districtsCovered', 'Districts we install in'],
] as const

export function Figures() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <section ref={ref} className="bg-navy py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 lg:grid-cols-4">
        {ROWS.map(([key, label]) => (
          <Figure key={key} value={SITE.figures[key]} label={label} active={inView} />
        ))}
      </div>
    </section>
  )
}

function Figure({ value, label, active }: {
  value: number | '[TBC]'; label: string; active: boolean
}) {
  const known = !isTBC(value)
  const count = useCountUp(known ? (value as number) : 0, active && known)
  return (
    <div>
      <p className="font-display text-5xl tracking-tight text-yellow lg:text-6xl">
        {known ? count : '—'}
      </p>
      <p className="u-mono mt-3 text-sky">{label}</p>
    </div>
  )
}
```

- [ ] **Step 4: Implement Materials**

The section carries the melamine argument head on. Copy below is factual and general — it makes no claim about grade, brand or figure, all of which stay in `MATERIAL_SPECS` as `[TBC]`.

```tsx
'use client'
import { useState } from 'react'
import { MATERIAL_SPECS } from '@/data/specs'
import { isTBC } from '@/lib/tbc'

const BOARD_ARGUMENT = [
  'Engineered board is wood fibre pressed with resin into a panel of consistent density, then faced with melamine.',
  'It does not have a grain direction, so a tall door stays flat where a solid timber one cups.',
  'Sri Lankan humidity swings year round. Solid wood moves with it. A sealed, edge-banded panel does not.',
  'Where there is water, under sinks and along a kitchen run, we use moisture-resistant board rather than standard board.',
]

export function Materials() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="materials" className="bg-navy py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display text-4xl tracking-tight text-white lg:text-5xl">
          What it is made of
        </h2>

        <ul className="mt-12 grid gap-px bg-teal/30 md:grid-cols-3">
          {MATERIAL_SPECS.map((spec, i) => (
            <li
              key={`${spec.slot}-${spec.label}`}
              onMouseEnter={() => setOpen(i)}
              onMouseLeave={() => setOpen(null)}
              onFocus={() => setOpen(i)}
              onBlur={() => setOpen(null)}
              tabIndex={0}
              className="bg-navy p-6"
            >
              <p className="u-mono text-sky">{spec.label}</p>
              {!isTBC(spec.value) && (
                <p className={`mt-2 text-white transition-opacity duration-200 ${
                  open === i ? 'opacity-100' : 'opacity-70'
                }`}>
                  {spec.value}
                </p>
              )}
            </li>
          ))}
        </ul>

        <div data-testid="board-argument" className="mt-12 max-w-2xl space-y-4">
          {BOARD_ARGUMENT.map((line) => (
            <p key={line} className="text-sky">{line}</p>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/sections/Figures.test.tsx src/components/sections/Materials.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Implement the weave graphics and logo slot**

Create `src/components/weave/WeaveDivider.tsx`. The motif is an over-under interlace: two sine paths crossing, with short gaps punched in the under-strand at each crossing so the strands read as woven rather than merely overlapping.

```tsx
export function WeaveDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full overflow-hidden text-teal ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 120 24"
        preserveAspectRatio="none"
        className="h-6 w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      >
        <defs>
          <pattern id="weave" width="40" height="24" patternUnits="userSpaceOnUse">
            {/* over-strand: continuous */}
            <path d="M0 12 C 10 0, 30 0, 40 12" />
            {/* under-strand: broken at each crossing */}
            <path d="M0 12 C 4 20, 8 22, 12 22" />
            <path d="M28 22 C 32 22, 36 20, 40 12" />
          </pattern>
        </defs>
        <rect width="120" height="24" fill="url(#weave)" stroke="none" />
      </svg>
    </div>
  )
}
```

Create `src/components/weave/WeaveTexture.tsx` — the same pattern at low opacity for the hero backdrop:

```tsx
export function WeaveTexture({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 text-teal opacity-[0.14] ${className}`} aria-hidden="true">
      <svg className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1">
        <defs>
          <pattern id="weave-texture" width="40" height="24" patternUnits="userSpaceOnUse">
            <path d="M0 12 C 10 0, 30 0, 40 12" />
            <path d="M0 12 C 4 20, 8 22, 12 22" />
            <path d="M28 22 C 32 22, 36 20, 40 12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#weave-texture)" stroke="none" />
      </svg>
    </div>
  )
}
```

Create the logo slot files. `src/assets/logo.svg` and `logo-navy.svg` are **placeholders to be replaced with the client's supplied mark**:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64" role="img" aria-label="Roomy Creations">
  <!-- PLACEHOLDER. Replace with the supplied woven interlace mark. See README. -->
  <circle cx="32" cy="32" r="26" fill="none" stroke="#F5CA4A" stroke-width="1.5"/>
  <text x="72" y="41" font-family="Outfit, sans-serif" font-size="24" font-weight="700" fill="#F5CA4A">
    Roomy Creations
  </text>
</svg>
```

`logo-navy.svg` is identical with `#023048` in place of `#F5CA4A`.

- [ ] **Step 7: Implement Hero**

Create `src/components/sections/Hero.tsx`. The master image is the LCP element, so it alone carries `priority`.

```tsx
'use client'
import Image from 'next/image'
import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { WeaveTexture } from '@/components/weave/WeaveTexture'
import { useMotionLevel } from '@/hooks/useMotionLevel'

export function Hero() {
  const level = useMotionLevel()
  const ref = useRef<HTMLElement>(null)
  const px = useMotionValue(0)
  const spring = useSpring(px, { stiffness: 120, damping: 20 })
  const cutoutX = useTransform(spring, [-1, 1], [-18, 18])

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={(e) => {
        if (level !== 'full') return
        px.set((e.clientX / window.innerWidth) * 2 - 1)
      }}
      className="relative flex min-h-screen items-center overflow-hidden bg-navy"
    >
      <Image
        src="/media/hero-master.jpg"
        alt="Fitted storage wall and upholstered sofa in a daylit apartment living room"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-navy/72" />
      <WeaveTexture />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-12">
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-white lg:text-7xl">
          We measure your wall, then build to it.
        </h1>
        <p className="mt-6 max-w-xl text-sky">
          Built-in wardrobes, pantry cupboards and upholstered seating, cut to the room you
          actually have.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href="#enquiry" className="bg-yellow px-7 py-4 font-display text-navy">
            Request a quotation
          </a>
          <a href="#work" className="border border-teal px-7 py-4 font-display text-sky">
            See our work
          </a>
        </div>
      </div>

      <motion.div
        style={{ x: level === 'full' ? cutoutX : 0 }}
        className="pointer-events-none absolute -right-16 bottom-0 hidden w-[38vw] lg:block"
      >
        <Image
          src="/media/cutout-sofa.png"
          alt=""
          aria-hidden="true"
          width={900}
          height={600}
          className="h-auto w-full"
        />
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 8: Implement the remaining sections**

Build `Position.tsx`, `WhatWeMake.tsx`, `HowWeWork.tsx`, all wrapped in `<WeaveReveal>` alternating `from="left"` / `from="right"`.

Each section element must carry the anchor id the nav links to: `Position` none, `WhatWeMake` none, `HowWeWork` → `id="how"`, `Materials` → `id="materials"`, `Enquiry` → `id="enquiry"`. The gallery `id="work"` is set in `page.tsx`.

- **Position** — three short lines, large type, lots of air, one detail shot bleeding off an edge. The three lines are: what we make, who we make it for, and the fit argument.
- **WhatWeMake** — five cards (Sofas & seating / Kitchens & pantry cupboards / Wardrobes & storage / TV & living units / Office & commercial), tilting in 3D on hover via Framer Motion `rotateX`/`rotateY` with `transformPerspective: 900`, image scaling inside its frame, teal hairline drawing in around it. Guard the tilt behind `useMotionLevel() === 'full'`.
- **HowWeWork** — Paper ground, wrapped in `.on-paper`, `id="how"`. Five numbered steps: Enquiry → Site measurement → Drawings, materials and quotation → Manufacture → Installation and handover. **Step 2, Site measurement, is visually the heaviest** — larger display type and a filled yellow block with navy type, because it is what separates fitted furniture from bought furniture. Lead times in mono, rendered as `—` while `[TBC]`. A cutout wardrobe module drifts across on scroll via `useScroll` + `useTransform`, guarded by motion level.

- [ ] **Step 9: Commit**

```bash
git add src/components/weave src/components/sections src/assets src/components/chrome/Logo.tsx
git commit -m "feat: add weave graphics, logo slot and remaining page sections"
```

---

### Task 15: Chrome, page assembly, metadata and README

**Files:**
- Create: `src/components/chrome/Nav.tsx`, `Footer.tsx`, `WhatsAppFloat.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`
- Create: `README.md`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: everything built so far.
- Produces: the assembled page.

- [ ] **Step 1: Write the failing test**

Create `src/app/page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

describe('Page', () => {
  it('has exactly one h1', () => {
    render(<Page />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('does not skip from h1 to h3', () => {
    render(<Page />)
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName[1]))
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1)
    }
  })

  it('never renders the TBC placeholder anywhere', () => {
    const { container } = render(<Page />)
    expect(container.textContent).not.toContain('[TBC]')
  })

  it('uses no banned marketing words', () => {
    const { container } = render(<Page />)
    const text = (container.textContent ?? '').toLowerCase()
    for (const word of [
      'nestled', 'boasts', 'epitome', 'exquisite', 'unparalleled',
      'one-stop solution', 'we strive to', 'dream home', 'turnkey',
    ]) {
      expect(text).not.toContain(word)
    }
  })

  it('uses no exclamation marks', () => {
    const { container } = render(<Page />)
    expect(container.textContent).not.toContain('!')
  })

  it('has no price, cart or checkout, because this is not a shop', () => {
    const { container } = render(<Page />)
    const text = (container.textContent ?? '').toLowerCase()
    for (const word of ['add to cart', 'checkout', 'buy now', 'rs.']) {
      expect(text).not.toContain(word)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL — sections not yet assembled.

- [ ] **Step 3: Implement WhatsAppFloat**

```tsx
'use client'
import { SITE } from '@/data/site'
import { whatsappUrl } from '@/lib/whatsapp'

export function WhatsAppFloat() {
  const href = whatsappUrl(SITE.whatsappNumber, 'Hello Roomy Creations, I would like a quotation for ')
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center
                 rounded-full bg-navy text-yellow shadow-lg md:hidden"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.2 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1a12 12 0 0 1-6.6-5.8c-.5-.9-.8-1.9-.4-2.8.2-.5.6-.9 1-1.1.2-.1.6-.1.8-.1.3 0 .4.1.6.4l.8 1.8c.1.2 0 .5-.1.7l-.4.5c-.2.2-.2.4-.1.6a8 8 0 0 0 3.6 3.1c.3.1.5.1.7-.1l.6-.7c.2-.2.4-.2.6-.1l1.7.9c.3.1.4.3.4.5s0 .5-.1.9z"/>
      </svg>
    </a>
  )
}
```

- [ ] **Step 4: Implement Nav and Footer**

Create `src/components/chrome/Nav.tsx` — logo top-left, thin nav right. Anchors only; this is one page.

```tsx
'use client'
import Image from 'next/image'
import logo from '@/assets/logo.svg'

const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#how', label: 'How we work' },
  { href: '#materials', label: 'Materials' },
  { href: '#enquiry', label: 'Enquire' },
]

export function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 lg:px-12">
      <a href="#top" aria-label="Roomy Creations, back to top">
        <Image src={logo} alt="Roomy Creations" height={40} priority />
      </a>
      <nav aria-label="Primary">
        <ul className="flex gap-6">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="u-mono text-sky transition-colors hover:text-yellow">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
```

Create `src/components/chrome/Footer.tsx`. Every fact comes from `SITE`; unknowns render nothing rather than a placeholder.

```tsx
import Image from 'next/image'
import logo from '@/assets/logo.svg'
import { SITE } from '@/data/site'
import { isTBC } from '@/lib/tbc'
import { whatsappUrl } from '@/lib/whatsapp'

const SOCIALS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
] as const

export function Footer() {
  const wa = whatsappUrl(SITE.whatsappNumber, 'Hello Roomy Creations, ')

  return (
    <footer className="bg-navy px-6 py-20 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-3">
        <div>
          <Image src={logo} alt="Roomy Creations" height={48} />
          {!isTBC(SITE.districts) && (
            <p className="mt-6 text-sky">
              We deliver and install across {SITE.districts.join(', ')}.
            </p>
          )}
        </div>

        <address className="not-italic">
          {!isTBC(SITE.addressLines) && (
            <p className="text-sky">
              {SITE.addressLines.join(', ')}
              {!isTBC(SITE.city) && `, ${SITE.city}`}
            </p>
          )}
          {!isTBC(SITE.phone) && (
            <p className="mt-3">
              <a href={`tel:${SITE.phone}`} className="text-sky hover:text-yellow">{SITE.phone}</a>
            </p>
          )}
          {!isTBC(SITE.email) && (
            <p className="mt-1">
              <a href={`mailto:${SITE.email}`} className="text-sky hover:text-yellow">{SITE.email}</a>
            </p>
          )}
          {!isTBC(SITE.openingHours) && (
            <ul className="mt-4">
              {SITE.openingHours.map((h) => <li key={h} className="u-mono text-sky">{h}</li>)}
            </ul>
          )}
        </address>

        <div>
          <ul className="flex gap-4">
            {SOCIALS.map(([key, label]) => {
              const href = SITE.social[key]
              return isTBC(href) ? null : (
                <li key={key}>
                  <a href={href} target="_blank" rel="noopener noreferrer"
                     className="u-mono text-sky hover:text-yellow">{label}</a>
                </li>
              )
            })}
          </ul>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
               className="u-mono mt-6 inline-block bg-yellow px-5 py-3 text-navy">
              Message us on WhatsApp
            </a>
          )}
        </div>
      </div>

      {!isTBC(SITE.mapEmbedUrl) && (
        <div className="mx-auto mt-16 max-w-6xl">
          <iframe
            src={SITE.mapEmbedUrl}
            title="Roomy Creations showroom location"
            loading="lazy"
            className="h-80 w-full border border-teal/40"
          />
        </div>
      )}
    </footer>
  )
}
```

- [ ] **Step 5: Assemble the page**

Replace `src/app/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'
import { SmoothScroll } from '@/components/chrome/SmoothScroll'
import { CustomCursor } from '@/components/chrome/CustomCursor'
import { WhatsAppFloat } from '@/components/chrome/WhatsAppFloat'
import { Nav } from '@/components/chrome/Nav'
import { Footer } from '@/components/chrome/Footer'
import { Hero } from '@/components/sections/Hero'
import { Position } from '@/components/sections/Position'
import { Figures } from '@/components/sections/Figures'
import { WhatWeMake } from '@/components/sections/WhatWeMake'
import { Film } from '@/components/sections/Film'
import { HowWeWork } from '@/components/sections/HowWeWork'
import { Materials } from '@/components/sections/Materials'
import { Enquiry } from '@/components/sections/Enquiry'
import { WeaveDivider } from '@/components/weave/WeaveDivider'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { Lightbox } from '@/components/gallery/Lightbox'

export default function Page() {
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <EnquiryPrefillProvider>
      <SmoothScroll />
      <CustomCursor />
      <Nav />

      <main>
        <Hero />
        <Position />
        <Figures />
        <WeaveDivider />
        <WhatWeMake />
        <Film />

        <section id="work" className="bg-navy py-24">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="font-display text-4xl tracking-tight text-white lg:text-5xl">
              Completed work
            </h2>
            <div className="mt-10">
              <GalleryGrid onOpen={setLightbox} />
            </div>
          </div>
        </section>

        <HowWeWork />
        <Materials />
        <Enquiry />
      </main>

      <Footer />
      <WhatsAppFloat />

      {lightbox !== null && (
        <Lightbox index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
      )}
    </EnquiryPrefillProvider>
  )
}
```

- [ ] **Step 6: Add metadata and structured data**

In `src/app/layout.tsx`, replace the `metadata` export and inject the JSON-LD. Keywords are worked into the description naturally, not stuffed.

```tsx
import { SITE } from '@/data/site'
import { buildLocalBusinessSchema } from '@/lib/schema'
import { isTBC } from '@/lib/tbc'

const city = isTBC(SITE.city) ? 'Sri Lanka' : SITE.city

export const metadata: Metadata = {
  title: `Roomy Creations — built-in wardrobes, pantry cupboards and sofas in ${city}`,
  description:
    `Fitted furniture in ${city}. Built-in wardrobes, pantry cupboards, modular kitchens, ` +
    'TV and storage walls, and upholstered sofas. Measured on site, cut to the space, installed clean.',
  openGraph: {
    title: 'Roomy Creations',
    description: `Fitted furniture, measured and installed in ${city}.`,
    images: ['/media/hero-master.jpg'],
    type: 'website',
  },
}
```

Inside `<body>`, before `{children}`:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLocalBusinessSchema(SITE)) }}
/>
```

- [ ] **Step 7: Create the work photo slots**

```bash
mkdir -p public/work
for i in $(seq -w 1 24); do
  printf 'Replace with work-%s.jpg. See README for the required aspect ratio.\n' "$i" \
    > "public/work/work-$i.txt"
done
```

Until real photographs arrive, `GalleryCard` renders a solid navy block behind the missing image — never an AI image.

- [ ] **Step 8: Write the README**

Create `README.md` covering: setup and scripts; the `.env` variables; **the `[TBC]` checklist** enumerating every unknown and the file it lives in; the **work photo slot table** (`work-01.jpg` … `work-24.jpg`, each with its required aspect ratio taken from `WORKS[i].ratio`, plus recommended pixel widths — 2000px on the long edge, WebP preferred with JPG fallback); the `-before.jpg` convention that switches on the compare slider; the film slot and the fact that `CLIP_STARTS` in `src/data/specs.ts` must match the real encode; and the logo replacement instruction.

- [ ] **Step 9: Run the full suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: assemble page with chrome, metadata, structured data and README"
```

---

## Phase B — requires the client's Higgsfield top-up

### Task 16: Generate and wire the image assets

**Files:**
- Create: `public/media/*.webp`, `public/media/*.jpg`
- Modify: `src/components/sections/Hero.tsx`, `Position.tsx`, `WhatWeMake.tsx`, `Materials.tsx`, `HowWeWork.tsx`
- Create: `docs/asset-manifest.md`

**Interfaces:**
- Consumes: the section components from Tasks 12 and 14.
- Produces: real image files at the paths those components already reference.

**Blocked until:** the Higgsfield balance covers the run. Check with the `balance` tool before starting; the free plan's 10 credits are not enough.

- [ ] **Step 1: Confirm the balance**

Call the Higgsfield `balance` tool. If credits are insufficient, stop and report — do not generate a partial set, since the whole point is that every asset matches the master's grade.

- [ ] **Step 2: Generate the master hero image**

One image. Prompt must carry the global photographic direction verbatim: bright even daylight in a contemporary apartment, cool-neutral white balance, matte handleless cabinetry in white and soft grey and wood-grain board, upholstered fabric seating, polished cement or light timber-look flooring, compact real-scale room, one deliberate deep-blue textile note, wide lens, soft directional daylight, no HDR, no orange grade, no rustic props, no exposed rough timber.

Record the returned media ID in `docs/asset-manifest.md`. Everything else derives from this image.

- [ ] **Step 3: Generate the five room scenes**

Image-to-image **from the master media ID** so surface tone and light match exactly: fitted kitchen / pantry run; built-in wardrobe with doors open; bedroom with headboard and storage; TV and storage wall; office or study fit-out. Record all five media IDs.

- [ ] **Step 4: Generate the five detail shots**

Tight, near-macro, shallow depth of field: edge-banded panel edge meeting a door front with raking light along the joint; soft-close hinge or drawer runner seated in board; woven upholstery fabric close up; fanned stack of board and edge-banding samples; lit wardrobe interior with shelving, rail and drawer box. Record media IDs.

- [ ] **Step 5: Generate the three cutouts**

Sofa in three-quarter view, wardrobe module with one door open, armchair. Run background removal on each and export transparent PNG so they sit directly on the navy ground.

- [ ] **Step 6: Download, convert and place**

Download every asset into `public/media/`. Convert to WebP with a JPG fallback:

```bash
npm i -D sharp
node -e "
const sharp=require('sharp'),fs=require('fs');
for (const f of fs.readdirSync('public/media').filter(f=>/\.(png|jpg)$/.test(f))) {
  const base='public/media/'+f.replace(/\.\w+$/,'');
  sharp('public/media/'+f).webp({quality:82}).toFile(base+'.webp');
}
"
```

Cutouts stay PNG — WebP conversion of transparency is fine, but keep a PNG fallback.

- [ ] **Step 7: Wire the assets in**

Replace the placeholder `src` values in Hero, Position, WhatWeMake, Materials and HowWeWork with the real paths. The hero master keeps `priority`; everything else is lazy. Confirm no placeholder images remain.

- [ ] **Step 8: Verify performance and commit**

Run: `npm run build && npx vitest run`

Then check the LCP budget: only the hero image should be preloaded, everything below the fold lazy. Confirm the OG image at `/media/hero-master.jpg` resolves.

```bash
git add public/media src/components/sections docs/asset-manifest.md
git commit -m "feat: generate and wire Higgsfield atmosphere assets"
```

---

## Phase C — deferred, at the client's discretion

### Task 17: The film

**Blocked until:** the client confirms the film is wanted, `ffmpeg` is installed (`brew install ffmpeg`), and credits cover four Seedance 2.0 clips.

- [ ] **Step 1: Generate four clips**, 4–5 seconds each, colour- and identity-matched to the master image, per the shot table in the spec (§8). Camera moves measured and controlled — slow tracks and pushes, no fast whips.
- [ ] **Step 2: Concatenate with hard cuts**, no crossfades:

```bash
ffmpeg -f concat -safe 0 -i clips.txt -c copy public/film/roomy-process.mp4
```

- [ ] **Step 3: Read the exact clip start timestamps** from the concatenated file and write them into `CLIP_STARTS` in `src/data/specs.ts`.
- [ ] **Step 4: Extract a poster frame** to `public/film/roomy-process-poster.jpg`.
- [ ] **Step 5: Verify the card sync** by playing through and confirming each card change lands on its cut.
- [ ] **Step 6: Commit.**

---

## Launch checklist — must be complete before the site goes live

- [ ] Client's real `logo.svg` and `logo-navy.svg` replace the placeholders in `src/assets/`.
- [ ] Every `[TBC]` in `src/data/site.ts` filled or the field deliberately dropped.
- [ ] Every `[TBC]` in `src/data/specs.ts` filled. **Any film card whose figure is still unknown is deleted, and its clip dropped, so the film runs three cuts.**
- [ ] `freeMeasurementVisit` set only if measurement visits genuinely are free and non-obligatory.
- [ ] Real photographs in all 24 `public/work/` slots, at the ratios declared in `works.ts`.
- [ ] `RESEND_API_KEY` and `ENQUIRY_TO_EMAIL` set, and a live test enquiry received.
- [ ] LocalBusiness JSON-LD validated in Google's Rich Results Test.
- [ ] Lighthouse on throttled 4G: LCP under 2.5s.
- [ ] Keyboard pass through every section; focus rings visible on both grounds.
- [ ] `prefers-reduced-motion` enabled: no transforms, no autoplay, no custom cursor.
