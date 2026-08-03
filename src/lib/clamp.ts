/**
 * A frame that has not been laid out yet has zero width, and the percentage
 * calculation divides by it. Landing on the midpoint keeps the slider usable
 * instead of collapsing it to one edge or crashing the layout.
 */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, value))
}
