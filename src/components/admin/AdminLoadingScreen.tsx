'use client'
import { HashLoader } from 'react-spinners'
import { BRAND } from '@/lib/brand'

/** Fallback UI for admin route segments — rendered by each section's
 *  loading.tsx while its page (and data fetch) resolves. */
export function AdminLoadingScreen() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <HashLoader size={40} color={BRAND.navy} aria-hidden="true" />
      <p className="u-mono text-sm text-navy/70">Loading…</p>
    </div>
  )
}
