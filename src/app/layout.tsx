import type { Metadata, Viewport } from 'next'
import { Outfit, Instrument_Sans, IBM_Plex_Mono, Bree_Serif } from 'next/font/google'
import { Toaster } from 'sonner'
import { Footer } from '@/components/chrome/Footer'
import { SiteChrome } from '@/components/chrome/SiteChrome'
import { buildMetadata, viewport as siteViewport } from '@/lib/metadata'
import { getSiteConfig } from '@/data/site'
import { getWorks } from '@/data/works'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', weight: ['600', '700'] })
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] })
// Wordmark-only: matches the client's supplied logo mark, not a general display font —
// everything else in the chrome keeps using --font-display (Outfit).
const breeSerif = Bree_Serif({ subsets: ['latin'], variable: '--font-bree', weight: '400' })

// SITE.url (and everything else metadata reads) now lives in the database, so
// this can no longer be a static object built at module load — Next calls this
// per-request instead.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig()
  return buildMetadata(site)
}

// F5/AGENTS.md: themeColor is deprecated on `metadata` since Next 14 — it belongs on
// this export instead (generate-metadata.md:654, generate-viewport.md).
export const viewport: Viewport = siteViewport

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, works] = await Promise.all([getSiteConfig(), getWorks()])

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${instrument.variable} ${plexMono.variable} ${breeSerif.variable}`}
    >
      <body>
        {/* page.tsx itself wraps its content in EnquiryPrefillProvider (see
            page.test.tsx) — the chrome below does not need that context, so it stays
            outside rather than nesting a second, redundant instance around it.
            SiteChrome wraps everything in SiteDataProvider itself, since WhatsAppFloat
            (outside {children}) needs it too, and also decides — client-side, via the
            route — whether the marketing-only Footer/WhatsApp/Nav-variant show at all. */}
        <SiteChrome site={site} works={works} footer={<Footer />}>
          {children}
        </SiteChrome>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
