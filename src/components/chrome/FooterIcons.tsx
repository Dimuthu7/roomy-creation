import type { ReactElement } from 'react'

type IconProps = { className?: string }
type IconComponent = (props: IconProps) => ReactElement

export function PhoneIcon({ className }: IconProps) {
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
      <path d="M6.5 4h2.8l1.2 4-2 1.4a11 11 0 0 0 5.1 5.1l1.4-2 4 1.2v2.8c0 1-.8 1.8-1.8 1.7-6.5-.6-11.5-5.6-12.1-12.1C4.7 4.8 5.5 4 6.5 4Z" />
    </svg>
  )
}

export function MapPinIcon({ className }: IconProps) {
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
      <path d="M12 21s-7-6.1-7-11.5a7 7 0 1 1 14 0C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

export function DistrictsIcon({ className }: IconProps) {
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
      <path d="M4 5.5 9 4l6 2 5-1.5v14L14 20l-6-2-4 1.5Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M14 8.5h2.5V5.3c-.43-.06-1.9-.19-3.03-.19-3 0-4.97 1.83-4.97 5.2v2.7H5.5v3.6h3v9.4h3.7v-9.4h3.06l.49-3.6h-3.55v-2.3c0-1.04.29-1.7 1.8-1.7Z" />
    </svg>
  )
}

export function InstagramIcon({ className }: IconProps) {
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
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.7" cy="7.3" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M15.8 3h-3v12.1a2.7 2.7 0 1 1-2.1-2.63V9.3a5.8 5.8 0 1 0 5.1 5.76V9.9a7.6 7.6 0 0 0 4.4 1.4V8.3a4.6 4.6 0 0 1-4.4-3.7V3Z" />
    </svg>
  )
}

export const SOCIAL_ICONS: Record<string, IconComponent> = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
}
