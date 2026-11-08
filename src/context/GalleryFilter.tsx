'use client'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { CategoryId } from '@/data/categories'
import { useMotionLevel } from '@/hooks/useMotionLevel'

interface GalleryFilterValue {
  active: CategoryId
  setActive: (id: CategoryId) => void
  /** Filters the gallery to one category and scrolls to it — "What we make" uses it. */
  showCategory: (id: CategoryId) => void
}

// null outside a provider: GalleryGrid then keeps its own local filter state, so it
// still works anywhere it is rendered on its own (its tests, or a future page).
const GalleryFilterContext = createContext<GalleryFilterValue | null>(null)

export function GalleryFilterProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<CategoryId>('all')
  const level = useMotionLevel()

  const showCategory = useCallback(
    (id: CategoryId) => {
      setActive(id)
      // Same reasoning as EnquiryPrefill's prefill(): an explicit `behavior` beats the
      // CSS reduced-motion guard, so it has to be computed rather than left 'smooth'.
      document.getElementById('work')?.scrollIntoView({
        behavior: level === 'reduced' ? 'auto' : 'smooth',
      })
    },
    [level],
  )

  const value = useMemo(() => ({ active, setActive, showCategory }), [active, showCategory])
  return <GalleryFilterContext.Provider value={value}>{children}</GalleryFilterContext.Provider>
}

export function useGalleryFilter(): GalleryFilterValue | null {
  return useContext(GalleryFilterContext)
}
