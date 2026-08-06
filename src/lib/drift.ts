/**
 * Horizontal offset for the decorative module that drifts across HowWeWork as the page
 * scrolls.
 *
 * A sine rather than a modulo: `(scrollY % period) - period / 2` looks continuous in
 * isolation but snaps the full width of its range every time the scroll position crosses
 * a multiple of the period, which reads as a glitch rather than as drift. A sine has no
 * such seam anywhere.
 */
export function driftX(scrollY: number, amplitude = 60, period = 1200): number {
  if (!Number.isFinite(scrollY)) return 0
  return Math.sin((scrollY / period) * Math.PI * 2) * amplitude
}
