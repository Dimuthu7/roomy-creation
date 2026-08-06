import { useId } from 'react'

/**
 * The same over-under weave motif as WeaveDivider, at low opacity, sized to fill its
 * positioned parent — used as a backdrop rather than a rule between sections.
 *
 * D3 applies here too: `useId()` keeps this pattern's id distinct from every other
 * WeaveTexture or WeaveDivider on the page, so nothing sharing the literal id
 * `weave-texture` can go blank when one instance unmounts.
 */
export function WeaveTexture({ className = '' }: { className?: string }) {
  const patternId = useId()

  return (
    <div
      className={`pointer-events-none absolute inset-0 text-teal opacity-[0.14] ${className}`}
      aria-hidden="true"
    >
      <svg className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1">
        <defs>
          <pattern id={patternId} width="40" height="24" patternUnits="userSpaceOnUse">
            <path d="M0 12 C 10 0, 30 0, 40 12" />
            <path d="M0 12 C 4 20, 8 22, 12 22" />
            <path d="M28 22 C 32 22, 36 20, 40 12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} stroke="none" />
      </svg>
    </div>
  )
}
