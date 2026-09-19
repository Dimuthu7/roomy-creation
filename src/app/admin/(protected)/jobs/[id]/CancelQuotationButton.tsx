'use client'
import { setJobStatus } from '../actions'

/** setJobStatus is a plain void form action (no per-field feedback needed for a
 *  single status flip), so the confirm step is the only reason this is a client
 *  component — it guards the one destructive-feeling action on this screen. */
export function CancelQuotationButton({ jobId }: { jobId: string }) {
  return (
    <form
      action={setJobStatus}
      onSubmit={(e) => {
        if (!confirm('Cancel this quotation? You can change its status back from the Status field later.')) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={jobId} />
      <input type="hidden" name="status" value="cancelled" />
      <button
        type="submit"
        className="rounded-full border border-navy px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95"
      >
        Cancel quotation
      </button>
    </form>
  )
}
