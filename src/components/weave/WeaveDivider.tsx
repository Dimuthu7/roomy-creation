import { useId } from 'react'

/**
 * An over-under interlace: two sine paths crossing, with short gaps punched in the
 * under-strand at each crossing so the strands read as woven rather than merely
 * overlapping.
 *
 * D3: the pattern id is generated with useId() rather than hardcoded, because a
 * hardcoded id collides the moment a second divider renders on the same page — the
 * probe confirmed every `url(#weave)` then resolves to the first instance, so
 * unmounting that first divider silently blanks every other one.
 */
export function WeaveDivider({ className = '' }: { className?: string }) {
  const patternId = useId()

  return (
    <div className={`w-full overflow-hidden text-teal ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 120 24"
        preserveAspectRatio="none"
        className="h-6 w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      >
        <defs>
          <pattern id={patternId} width="40" height="24" patternUnits="userSpaceOnUse">
            {/* over-strand: continuous */}
            <path d="M0 12 C 10 0, 30 0, 40 12" />
            {/* under-strand: broken at each crossing */}
            <path d="M0 12 C 4 20, 8 22, 12 22" />
            <path d="M28 22 C 32 22, 36 20, 40 12" />
          </pattern>
        </defs>
        <rect width="120" height="24" fill={`url(#${patternId})`} stroke="none" />
      </svg>
    </div>
  )
}
