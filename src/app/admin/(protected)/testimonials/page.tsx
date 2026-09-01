import { getAllTestimonials, type AdminTestimonial } from '@/data/testimonials'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { SyncFacebookButton } from './SyncFacebookButton'
import { ManualTestimonialForm } from './ManualTestimonialForm'
import { setTestimonialVisible, moveTestimonial, deleteManualTestimonial } from './actions'

function sourceLabel(row: AdminTestimonial): string {
  return row.source === 'facebook' ? 'Facebook' : 'Manual'
}

function ratingLabel(row: AdminTestimonial): string | null {
  if (row.source === 'facebook') {
    if (row.recommended === true) return 'Recommends'
    if (row.recommended === false) return 'Does not recommend'
    return null
  }
  return row.rating != null ? `${row.rating}/5` : null
}

function RowAvatar({ row }: { row: AdminTestimonial }) {
  if (row.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- per-reviewer Facebook CDN URL, not a static asset next/image's remote-pattern allowlist fits
      <img src={row.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
    )
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy/30 bg-navy/5 text-navy/40">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 19.5c1.4-3.6 4.3-5.3 7.5-5.3s6.1 1.7 7.5 5.3" />
      </svg>
    </span>
  )
}

export default async function TestimonialsPage() {
  const rows = await getAllTestimonials()
  const visibleRows = rows
    .filter((r) => r.visible)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-navy">Manage testimonials</h1>
        <p className="u-mono mt-1 text-navy/70">
          Sync reviews from Facebook, then choose which ones appear on the site.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SyncFacebookButton />
        <ManualTestimonialForm />
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="u-mono text-sm text-navy/70">No testimonials yet.</p>}
        {rows.map((row) => {
          const visibleIndex = visibleRows.findIndex((v) => v.id === row.id)
          const isFirst = visibleIndex === 0
          const isLast = visibleIndex === visibleRows.length - 1
          const label = ratingLabel(row)

          return (
            <div
              key={row.id}
              data-testid="testimonial-row"
              className="flex flex-wrap items-start justify-between gap-4 border-2 border-navy p-4"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <RowAvatar row={row} />
                <div className="min-w-0">
                  <p className="u-mono text-xs text-navy/60">
                    {sourceLabel(row)}
                    {label ? ` · ${label}` : ''}
                  </p>
                  <p className="font-display text-sm text-navy">{row.authorName}</p>
                  <p className="mt-1 truncate text-sm text-navy/80">{row.reviewText}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {row.visible && (
                  <>
                    <form action={moveTestimonial}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="direction" value="up" />
                      <AdminSubmitButton
                        label="↑"
                        pendingLabel=""
                        disabled={isFirst}
                        ariaLabel="Move up"
                        spinnerSize={12}
                        className="h-8 w-8 rounded-full border border-navy text-navy disabled:opacity-30"
                      />
                    </form>
                    <form action={moveTestimonial}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="direction" value="down" />
                      <AdminSubmitButton
                        label="↓"
                        pendingLabel=""
                        disabled={isLast}
                        ariaLabel="Move down"
                        spinnerSize={12}
                        className="h-8 w-8 rounded-full border border-navy text-navy disabled:opacity-30"
                      />
                    </form>
                  </>
                )}

                <form action={setTestimonialVisible}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="visible" value={row.visible ? 'false' : 'true'} />
                  <AdminSubmitButton
                    label={row.visible ? 'Hide' : 'Show on site'}
                    pendingLabel={row.visible ? 'Hiding' : 'Showing'}
                    spinnerSize={12}
                    className="rounded-full border border-navy px-3 py-1.5 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-60"
                  />
                </form>

                {row.source === 'manual' && (
                  <form action={deleteManualTestimonial}>
                    <input type="hidden" name="id" value={row.id} />
                    <AdminSubmitButton
                      label="Delete"
                      pendingLabel="Deleting"
                      ariaLabel="Delete"
                      spinnerSize={12}
                      className="rounded-full border border-navy px-3 py-1.5 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-60"
                    />
                  </form>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
