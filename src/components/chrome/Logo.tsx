import Image from 'next/image'
import logoMark from '@/assets/logo-mark.png'

const TEXT_COLOR = { yellow: 'text-yellow', navy: 'text-navy' } as const

/**
 * The mark is the client's supplied woven-interlace icon, cropped to just the circle
 * (no background) so it drops onto any surface. The wordmark is real text rather than
 * baked into the image: it stays crisp at any size, and it's what actually carries the
 * accessible name — the icon next to it is decorative (`alt=""`).
 */
export function Logo({ variant = 'yellow' }: { variant?: 'yellow' | 'navy' }) {
  return (
    <span className="flex items-center gap-2">
      <Image src={logoMark} alt="" width={32} height={32} className="h-8 w-8" />
      <span className={`font-wordmark text-xl ${TEXT_COLOR[variant]}`}>Roomy Creations</span>
    </span>
  )
}
