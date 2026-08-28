'use client'
import { motion } from 'framer-motion'
import { useMotionLevel } from '@/hooks/useMotionLevel'

/**
 * One joint on the thread that runs beside Position's lines: a node where a
 * line "arrives", plus — unless it's the last node — the strand connecting down to
 * the next one. Growth is scroll-triggered off the same delay driving that line's
 * WeaveReveal, so the thread reads as stitching the statements together rather
 * than a decoration bolted on afterward. `gap` must resolve to the same length as
 * the grid's own gap-y so the strand's calc(100% + gap) lands exactly on the next
 * node instead of over- or undershooting it — pass a shared CSS variable (e.g.
 * `var(--pos-gap)`) rather than a duplicated literal, so the two values read from
 * one source and can't drift apart.
 */
export function WeaveThreadNode({
  delay,
  hasNext,
  gap,
}: {
  delay: number
  hasNext: boolean
  gap: string
}) {
  const level = useMotionLevel()
  const reduced = level === 'reduced'

  return (
    <div className="relative flex justify-center" aria-hidden="true">
      <motion.span
        className="absolute top-1 h-2 w-2 rounded-full bg-yellow"
        initial={reduced ? undefined : { scale: 0.5, opacity: 0 }}
        // A pop-in bounce (overshoot past full size, then settle) rather than a
        // single eased scale-up — matches the reference the client pointed to
        // (react-vertical-timeline-component's cd-bounce-1 keyframes: 0.5 -> 1.2 ->
        // 1) for a punchier "arrival" than this project's usual gentle overshoot.
        whileInView={reduced ? undefined : { scale: [0.5, 1.2, 1], opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.6, delay, times: [0, 0.6, 1], ease: 'easeOut' }}
      />
      {hasNext && (
        <motion.span
          className="absolute top-2 w-px origin-top bg-teal/50"
          style={{ height: `calc(100% + ${gap})` }}
          initial={reduced ? undefined : { scaleY: 0 }}
          whileInView={reduced ? undefined : { scaleY: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.4, delay: delay + 0.15, ease: [0.65, 0, 0.35, 1] }}
        />
      )}
    </div>
  )
}
