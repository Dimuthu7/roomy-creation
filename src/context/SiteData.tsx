'use client'
import { createContext, useContext } from 'react'
import type { SiteConfig } from '@/data/site'
import type { Work } from '@/data/works'
import type { Testimonial } from '@/data/testimonials'

interface SiteDataValue {
  site: SiteConfig
  works: Work[]
  testimonials: Testimonial[]
}

// undefined (not a fallback object) on purpose: every consumer genuinely needs
// real DB-backed data, so a missing provider should fail loudly, not render
// with silently wrong contact info or an empty gallery.
const SiteDataContext = createContext<SiteDataValue | undefined>(undefined)

export function SiteDataProvider({
  site,
  works,
  testimonials,
  children,
}: SiteDataValue & { children: React.ReactNode }) {
  return (
    <SiteDataContext.Provider value={{ site, works, testimonials }}>{children}</SiteDataContext.Provider>
  )
}

export function useSiteData(): SiteDataValue {
  const value = useContext(SiteDataContext)
  if (!value) {
    throw new Error('useSiteData must be used within a SiteDataProvider')
  }
  return value
}
