'use client'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useMotionLevel } from '@/hooks/useMotionLevel'

interface EnquiryPrefillValue {
  needs: string[]
  prefill: (need: string) => void
}

// The lightbox mounts on pages that may not have an enquiry form yet (Task 15), and a
// gallery card must never crash a page for lacking one. The default value makes
// useEnquiryPrefill inert outside a provider rather than throwing.
const EnquiryPrefillContext = createContext<EnquiryPrefillValue>({
  needs: [],
  prefill: () => {},
})

export function EnquiryPrefillProvider({ children }: { children: React.ReactNode }) {
  const [needs, setNeeds] = useState<string[]>([])
  const level = useMotionLevel()

  const prefill = useCallback(
    (need: string) => {
      setNeeds((current) => (current.includes(need) ? current : [...current, need]))
      // An explicit `behavior` here beats the CSS `scroll-behavior` reduced-motion guard,
      // so it has to be computed rather than left at the default 'smooth'.
      document.getElementById('enquiry')?.scrollIntoView({
        behavior: level === 'reduced' ? 'auto' : 'smooth',
      })
    },
    [level],
  )

  const value = useMemo(() => ({ needs, prefill }), [needs, prefill])

  return <EnquiryPrefillContext.Provider value={value}>{children}</EnquiryPrefillContext.Provider>
}

export function useEnquiryPrefill(): EnquiryPrefillValue {
  return useContext(EnquiryPrefillContext)
}
