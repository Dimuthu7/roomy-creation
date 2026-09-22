'use client'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { setJobStage } from '../actions'

/** Shows exactly one of the two stage-changing actions, based on the job's current
 *  stage — never both at once, since they're inverses of each other. `resolved` gates
 *  Confirm order client-side (disabled + reason shown) as a UX nicety; the action
 *  itself re-checks server-side regardless, per this slice's invariant that a job
 *  cannot become an order while any unit is unresolved. */
export function StageButtons({ jobId, stage, resolved }: { jobId: string; stage: string; resolved: boolean }) {
  if (stage === 'order') {
    return (
      <form
        action={setJobStage}
        onSubmit={(e) => {
          if (!confirm('Revert this order back to a quotation?')) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={jobId} />
        <input type="hidden" name="stage" value="quotation" />
        <AdminSubmitButton
          label="Revert to quotation"
          pendingLabel="Reverting"
          className="u-mono text-xs text-navy/60 underline disabled:opacity-60"
        />
      </form>
    )
  }

  return (
    <form
      action={setJobStage}
      onSubmit={(e) => {
        if (!confirm('Confirm this quotation as an order?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={jobId} />
      <input type="hidden" name="stage" value="order" />
      <AdminSubmitButton
        label="Confirm order"
        pendingLabel="Confirming"
        disabled={!resolved}
        title={resolved ? undefined : 'Every unit needs a chosen option before this quotation can become an order'}
        className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </form>
  )
}
