'use client'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SmoothScroll } from './SmoothScroll'
import { CustomCursor } from './CustomCursor'
import { Nav } from './Nav'
import { WhatsAppFloat } from './WhatsAppFloat'
import { ScrollToTop } from './ScrollToTop'
import { SiteDataProvider } from '@/context/SiteData'
import type { SiteConfig } from '@/data/site'
import type { Work } from '@/data/works'

// Footer is a server component (it fetches its own data), so it can't check the
// route itself — the root layout renders it and hands it in here, where the
// client-side pathname check decides whether it actually gets mounted.
export function SiteChrome({
  site,
  works,
  footer,
  children,
}: {
  site: SiteConfig
  works: Work[]
  footer: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  // The login screen gets no chrome at all — it's a standalone auth card, not part
  // of the marketing site or the logged-in admin tool. Every other /admin route
  // keeps Nav (in its admin variant) but drops the marketing-only Footer/WhatsApp.
  const isAdminLogin = pathname === '/admin/login'
  const isAdmin = pathname.startsWith('/admin')

  return (
    <SiteDataProvider site={site} works={works}>
      <SmoothScroll />
      <CustomCursor />
      {!isAdminLogin && <Nav />}
      {children}
      {!isAdmin && footer}
      {!isAdmin && <WhatsAppFloat />}
      <ScrollToTop />
    </SiteDataProvider>
  )
}
