/**
 * Which line should be active in a pinned scroll-reveal section, given the pinned
 * track's current position. Splits the track's scrollable range evenly across
 * `stepCount` lines: 0 before the track has scrolled at all, `stepCount - 1` once
 * scrolled all the way through, floor-stepped in between. `trackTop` is the pinned
 * element's own `getBoundingClientRect().top` — 0 once it has scrolled to the top of
 * the viewport, negative beyond that.
 */
export function activeScrollStep(
  trackTop: number,
  trackHeight: number,
  viewportHeight: number,
  stepCount: number,
): number {
  if (!Number.isFinite(trackTop) || stepCount <= 0) return 0
  const scrollable = trackHeight - viewportHeight
  if (scrollable <= 0) return 0
  const progress = Math.min(1, Math.max(0, -trackTop / scrollable))
  return Math.min(stepCount - 1, Math.floor(progress * stepCount))
}
