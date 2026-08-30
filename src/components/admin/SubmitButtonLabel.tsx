'use client'
import { HashLoader } from 'react-spinners'
import { BRAND } from '@/lib/brand'

/** Shared content for a pending-aware admin submit button — the button itself
 *  (size, width, padding) stays with each call site since those vary. */
export function SubmitButtonLabel({
  pending,
  label,
  pendingLabel,
  spinnerSize = 16,
}: {
  pending: boolean
  label: string
  pendingLabel: string
  spinnerSize?: number
}) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {pending && <HashLoader size={spinnerSize} color={BRAND.navy} aria-hidden="true" />}
      {pending ? pendingLabel : label}
    </span>
  )
}
