import type { ReactElement } from 'react'

type IconProps = { className?: string }
type IconComponent = (props: IconProps) => ReactElement

export function BoardIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="8" width="14" height="10" rx="1" />
      <path d="M4 8l4-3h12l-4 3" />
      <path d="M18 8v10l4-3V5l-4 3Z" />
    </svg>
  )
}

export function MoistureIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c4 5 6 8.4 6 11a6 6 0 1 1-12 0c0-2.6 2-6 6-11Z" />
    </svg>
  )
}

export function EdgeBandingIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="5" y="5" width="14" height="14" rx="1" />
      <path d="M5 5v14" strokeWidth={3} />
    </svg>
  )
}

export function HingeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 4v16" />
      <path d="M4 8h6a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4" />
      <path d="M4 14h6a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="16" r="0.9" fill="currentColor" stroke="none" />
      <path d="M15.5 8a6.2 6.2 0 0 1 0 8" />
    </svg>
  )
}

export function FabricIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 8c2-2 3.83-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0" />
      <path d="M3.5 13.5c2-2 3.83-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0" />
      <path d="M3.5 19c2-2 3.83-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0" />
    </svg>
  )
}

export function WarrantyIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3.5l7 2.8v5.7c0 4.8-3.2 7.7-7 8.7-3.8-1-7-3.9-7-8.7V6.3L12 3.5Z" />
      <path d="M9 12.2l2.2 2.2L15.5 10" />
    </svg>
  )
}

/** Fallback for any spec label not covered by the named icons above. */
export function SpecIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9.5h8M8 13h8M8 16.5h5" />
    </svg>
  )
}

/**
 * Keyed by MaterialSpec.label rather than .slot: two specs share the 'edge' slot
 * (board type and edge banding) but need visually distinct icons. Any label not
 * listed here — including the arbitrary labels Materials.test.tsx substitutes in
 * isolation tests — falls back to SpecIcon rather than rendering nothing.
 */
export const MATERIAL_SPEC_ICONS: Record<string, IconComponent> = {
  'Board type and thickness': BoardIcon,
  'Where we use moisture-resistant board': MoistureIcon,
  'Edge banding': EdgeBandingIcon,
  'Hinge and runner, with cycle rating': HingeIcon,
  'Upholstery fabric and foam density': FabricIcon,
  Warranty: WarrantyIcon,
}
