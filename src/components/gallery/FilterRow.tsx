'use client'
import { CATEGORIES, type CategoryId } from '@/data/categories'

export function FilterRow({
  active,
  onChange,
}: {
  active: CategoryId
  onChange: (id: CategoryId) => void
}) {
  return (
    <div role="group" aria-label="Filter work by category" className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const isActive = c.id === active
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(c.id)}
            className={`u-mono rounded-full px-4 py-2 transition-colors duration-200 ${
              isActive
                ? 'bg-yellow text-navy'
                : 'border border-teal/40 text-sky hover:border-teal'
            }`}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
