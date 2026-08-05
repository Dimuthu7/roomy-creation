import type { Ratio } from '@/data/works'

/**
 * Tailwind scans source for complete class strings, so an interpolated
 * `aspect-[${ratio}]` would compile to nothing at all. Every class here has to
 * appear literally for the CSS to exist.
 */
const ASPECT_CLASS: Record<Ratio, string> = {
  '3:2': 'aspect-[3/2]',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-[16/9]',
  '4:5': 'aspect-[4/5]',
}

export function aspectClass(ratio: Ratio): string {
  return ASPECT_CLASS[ratio]
}
