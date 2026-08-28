import type { ReactElement } from 'react'

type IconProps = { className?: string }
type IconComponent = (props: IconProps) => ReactElement

export function SofaIcon({ className }: IconProps) {
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
      <path d="M5 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <path d="M3 12a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3Z" />
      <path d="M5 16v2M19 16v2" />
    </svg>
  )
}

export function KitchenIcon({ className }: IconProps) {
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
      <path d="M4 7l2-3h12l2 3" />
      <rect x="4" y="7" width="16" height="12" rx="1" />
      <path d="M12 7v12" />
      <circle cx="10" cy="13" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WardrobeIcon({ className }: IconProps) {
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
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M12 3v18" />
      <circle cx="9" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TvIcon({ className }: IconProps) {
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
      <rect x="3" y="5" width="18" height="12" rx="1" />
      <path d="M8 20h8M12 17v3" />
    </svg>
  )
}

export function OfficeIcon({ className }: IconProps) {
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
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M4 13h16" />
    </svg>
  )
}

/** Fallback for any card label not covered by the named icons above. */
export function MakeIcon({ className }: IconProps) {
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

export const WHAT_WE_MAKE_ICONS: Record<string, IconComponent> = {
  'Sofas & seating': SofaIcon,
  'Kitchens & pantry cupboards': KitchenIcon,
  'Wardrobes & storage': WardrobeIcon,
  'TV & living units': TvIcon,
  'Office & commercial': OfficeIcon,
}
