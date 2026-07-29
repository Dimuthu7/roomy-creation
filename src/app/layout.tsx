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
