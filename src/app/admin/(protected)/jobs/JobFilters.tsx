'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { JOB_STATUSES, STATUS_LABELS } from '@/lib/jobs/schema'

const FIELD = 'border border-navy bg-transparent p-2 text-sm text-navy'
const LABEL = 'u-mono block text-xs text-navy/70'
const QUERY_DEBOUNCE_MS = 250

interface Filters {
  q: string
  status: string
  from: string
  to: string
}

/** Filters live entirely in the URL's query string, so the list itself stays a plain
 *  server component (no client-side fetching) and a filtered view is shareable and
 *  survives a refresh. All four values are held in local state (seeded once from the
 *  URL) rather than read from useSearchParams() on every update: router.replace()
 *  doesn't resolve synchronously, so two fields changed in quick succession — e.g.
 *  picking both ends of a date range — would otherwise each build their next URL from
 *  a stale searchParams snapshot and clobber each other's change. */
export function JobFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(() => ({
    q: searchParams.get('q') ?? '',
    status: searchParams.get('status') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
  }))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushUrl(next: Filters) {
    const params = new URLSearchParams()
    if (next.q) params.set('q', next.q)
    if (next.status) params.set('status', next.status)
    if (next.from) params.set('from', next.from)
    if (next.to) params.set('to', next.to)
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, { scroll: false })
  }

  function updateField(key: keyof Filters, value: string, debounce: boolean) {
    const next = { ...filters, [key]: value }
    setFilters(next)
    if (!debounce) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      pushUrl(next)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushUrl(next), QUERY_DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const hasFilters = filters.q || filters.status || filters.from || filters.to

  return (
    <div className="grid grid-cols-1 gap-4 border border-navy/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <label className={LABEL}>Search (ref, customer or phone)</label>
        <input
          data-testid="job-filter-q"
          value={filters.q}
          onChange={(e) => updateField('q', e.target.value, true)}
          placeholder="RC00195, Dimuthu, 077…"
          className={`${FIELD} mt-1 w-full`}
        />
      </div>
      <div>
        <label className={LABEL}>Status</label>
        <select
          data-testid="job-filter-status"
          value={filters.status}
          onChange={(e) => updateField('status', e.target.value, false)}
          className={`${FIELD} mt-1 w-full`}
        >
          <option value="">All</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL}>From</label>
        <input
          type="date"
          data-testid="job-filter-from"
          value={filters.from}
          onChange={(e) => updateField('from', e.target.value, false)}
          className={`${FIELD} mt-1 w-full`}
        />
      </div>
      <div>
        <label className={LABEL}>To</label>
        <input
          type="date"
          data-testid="job-filter-to"
          value={filters.to}
          onChange={(e) => updateField('to', e.target.value, false)}
          className={`${FIELD} mt-1 w-full`}
        />
      </div>
      {hasFilters && (
        <button
          type="button"
          data-testid="job-filter-clear"
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            const cleared = { q: '', status: '', from: '', to: '' }
            setFilters(cleared)
            pushUrl(cleared)
          }}
          className="u-mono w-fit text-xs text-navy/60 underline lg:col-span-5"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
