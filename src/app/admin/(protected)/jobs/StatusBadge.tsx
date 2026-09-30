import { STATUS_LABELS } from '@/lib/jobs/schema'

const STAGE_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order',
}

// Color follows `status`, not `stage` — status is what tells you whether the job needs
// attention (pending/in_progress), is done (finished), or is dead (cancelled).
const STATUS_STYLES: Record<string, string> = {
  pending: 'border-navy/40 text-navy/70',
  in_progress: 'border-navy bg-yellow text-navy',
  finished: 'border-navy bg-teal text-paper',
  cancelled: 'border-navy/40 border-dashed text-navy/50',
}

export function StatusBadge({ stage, status }: { stage: string; status: string }) {
  const stageLabel = STAGE_LABELS[stage] ?? stage
  const statusLabel = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status
  const style = STATUS_STYLES[status] ?? 'border-navy/40 text-navy/70'

  return (
    <span className={`u-mono inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs ${style}`}>
      {stageLabel}
      <span aria-hidden="true">·</span>
      {statusLabel}
    </span>
  )
}
