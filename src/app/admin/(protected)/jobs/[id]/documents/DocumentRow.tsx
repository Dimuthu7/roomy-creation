'use client'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { emailDocument, type ActionState } from './actions'

const initialState: ActionState = {}

const KIND_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  order: 'Order',
  receipt: 'Receipt',
  advance_invoice: 'Advance invoice',
  final_invoice: 'Final invoice',
  warranty_card: 'Warranty card',
}

export function DocumentRow({
  id,
  kind,
  number,
  blobUrl,
  createdAt,
  sentTo,
  sentAt,
  stale,
}: {
  id: string
  kind: string
  number: string
  blobUrl: string
  createdAt: string
  sentTo: string | null
  sentAt: string | null
  stale: boolean
}) {
  const [state, formAction] = useActionState(emailDocument, initialState)

  useEffect(() => {
    if (state.success) toast.success('Emailed to the customer.')
    else if (state.error) toast.error(state.error)
  }, [state])

  return (
    <div data-testid="document-row" className="flex flex-wrap items-center justify-between gap-4 border border-navy/40 p-4">
      <div>
        <p data-testid="document-number" className="font-display text-navy">
          {number} <span className="u-mono text-xs text-navy/60">({KIND_LABELS[kind] ?? kind})</span>
        </p>
        <p className="u-mono mt-1 text-xs text-navy/60">Generated {new Date(createdAt).toLocaleString()}</p>
        <p data-testid="document-sent-status" className="u-mono text-xs text-navy/60">
          {sentAt ? `Sent to ${sentTo} at ${new Date(sentAt).toLocaleString()}` : 'Not sent yet'}
        </p>
        {stale && (
          <p data-testid="document-stale-warning" className="u-mono mt-1 text-xs text-red-700">
            Job has changed since this was generated — regenerate before sending.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <a
          href={blobUrl}
          target="_blank"
          rel="noreferrer"
          data-testid="document-download"
          className="rounded-full border border-navy px-4 py-2 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95"
        >
          Download
        </a>
        <form action={formAction}>
          <input type="hidden" name="documentId" value={id} />
          <AdminSubmitButton
            label="Send by email"
            pendingLabel="Sending"
            className="rounded-full border border-navy px-4 py-2 font-display text-xs text-navy transition duration-200 hover:bg-navy hover:text-paper active:scale-95 disabled:opacity-60"
            ariaLabel={`Send ${number} by email`}
          />
        </form>
      </div>
    </div>
  )
}
