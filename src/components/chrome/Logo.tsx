import Image from 'next/image'
import logoMark from '@/assets/logo-mark.png'

const TEXT_COLOR = { yellow: 'text-yellow', navy: 'text-navy' } as const

/**
 * The mark is the client's supplied gold RC monogram, cropped tight on a transparent
 * background so it drops onto any surface. It's wider than tall, so only the height is
 * fixed and the width follows the artwork's aspect ratio. The wordmark is real text rather than
 * baked into the image: it stays crisp at any size, and it's what actually carries the
 * accessible name — the icon next to it is decorative (`alt=""`).
 */
// The gold mark is solid and heavy, so at the wordmark's own height it out-weighed the
// text and crowded the bar. In the nav it sits a step smaller than the text's line
// (24px on a phone, 28px from `sm` up); the footer, with room to spare, keeps the
// larger 32px size.
const SIZES = {
  nav: { mark: 'h-6 sm:h-7', text: 'text-lg sm:text-xl' },
  footer: { mark: 'h-8', text: 'text-xl' },
} as const

export function Logo({
  variant = 'yellow',
  size = 'footer',
}: {
  variant?: 'yellow' | 'navy'
  size?: keyof typeof SIZES
}) {
  return (
    <span className="flex items-center gap-2">
      <Image src={logoMark} alt="" width={39} height={32} className={`${SIZES[size].mark} w-auto`} />
      <span className={`font-wordmark ${SIZES[size].text} ${TEXT_COLOR[variant]}`}>Roomy Creations</span>
    </span>
  )
}
