'use client'
import type { CategoryId } from '@/data/categories'

export function FilterRow({
  categories,
  active,
  onChange,
}: {
  categories: ReadonlyArray<{ id: CategoryId; label: string }>
  active: CategoryId
  onChange: (id: CategoryId) => void
}) {
  return (
    <div role="group" aria-label="Filter work by category" className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const isActive = c.id === active
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(c.id)}
            className={`u-mono rounded-full px-4 py-2 transition duration-200 active:scale-95 ${
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
