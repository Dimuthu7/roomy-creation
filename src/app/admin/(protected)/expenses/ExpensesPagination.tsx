import Link from 'next/link'

const BUTTON = 'flex h-8 min-w-8 items-center justify-center border-2 border-navy px-2 u-mono text-xs transition duration-200'
const ACTIVE = `${BUTTON} bg-navy font-display text-paper`
const INACTIVE = `${BUTTON} hover:bg-navy hover:text-paper`
const DISABLED = `${BUTTON} border-navy/30 text-navy/30`

function pageWindow(page: number, totalPages: number): (number | 'ellipsis')[] {
  const window = 1
  const pages = new Set<number>([1, totalPages])
  for (let p = page - window; p <= page + window; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis')
    result.push(sorted[i])
  }
  return result
}

export function ExpensesPagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number
  totalPages: number
  searchParams: { month?: string; category?: string }
}) {
  if (totalPages <= 1) return null

  function href(target: number) {
    const params = new URLSearchParams()
    if (searchParams.month) params.set('month', searchParams.month)
    if (searchParams.category) params.set('category', searchParams.category)
    if (target > 1) params.set('page', String(target))
    const qs = params.toString()
    return qs ? `?${qs}` : '?'
  }

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={INACTIVE} aria-label="Previous page">
          ←
        </Link>
      ) : (
        <span className={DISABLED} aria-hidden="true">
          ←
        </span>
      )}

      {pageWindow(page, totalPages).map((entry, i) =>
        entry === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="u-mono px-1 text-xs text-navy/50">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={entry === page ? ACTIVE : INACTIVE}
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} className={INACTIVE} aria-label="Next page">
          →
        </Link>
      ) : (
        <span className={DISABLED} aria-hidden="true">
          →
        </span>
      )}
    </nav>
  )
}
