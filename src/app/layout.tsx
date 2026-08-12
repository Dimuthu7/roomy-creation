import type { Metadata, Viewport } from 'next'
import { Outfit, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { SmoothScroll } from '@/components/chrome/SmoothScroll'
import { CustomCursor } from '@/components/chrome/CustomCursor'
import { Nav } from '@/components/chrome/Nav'
import { Footer } from '@/components/chrome/Footer'
import { WhatsAppFloat } from '@/components/chrome/WhatsAppFloat'
import { buildMetadata, viewport as siteViewport } from '@/lib/metadata'
import { SITE } from '@/data/site'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', weight: ['600', '700'] })
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] })

export const metadata: Metadata = buildMetadata(SITE)

// F5/AGENTS.md: themeColor is deprecated on `metadata` since Next 14 — it belongs on
// this export instead (generate-metadata.md:654, generate-viewport.md).
export const viewport: Viewport = siteViewport

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body>
        {/* page.tsx itself wraps its content in EnquiryPrefillProvider (see
            page.test.tsx) — the chrome below does not need that context, so it stays
            outside rather than nesting a second, redundant instance around it. */}
        <SmoothScroll />
        <CustomCursor />
        <Nav />
        {children}
        <Footer />
        <WhatsAppFloat />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
