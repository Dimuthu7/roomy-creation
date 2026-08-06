import Image from 'next/image'
import logoYellow from '@/assets/logo.svg'
import logoNavy from '@/assets/logo-navy.svg'

const SOURCES = { yellow: logoYellow, navy: logoNavy }

/**
 * The client has supplied no mark yet, so both `src/assets/logo*.svg` files are
 * placeholders (each keeps a `<!-- PLACEHOLDER -->` comment so nobody mistakes them
 * for the real thing). The accessible name is set explicitly here rather than relying
 * on the SVG's own internal `aria-label` — once rendered through `next/image` the file
 * is opaque to assistive tech, so the outer `alt` is what actually gets announced.
 *
 * Explicit width/height (matching the artwork's 240:64 viewBox) rather than `fill`:
 * this is a small chrome mark, not a photo, and it needs to lay out correctly
 * wherever it is dropped without a positioned parent.
 */
export function Logo({ variant = 'yellow' }: { variant?: 'yellow' | 'navy' }) {
  return (
    <Image src={SOURCES[variant]} alt="Roomy Creations" width={120} height={32} className="h-8 w-auto" />
  )
}
