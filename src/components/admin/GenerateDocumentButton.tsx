'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { DOCUMENT_MIME, type PrepareState } from '@/lib/jobs/documentFiles'
import { renderDocumentFile } from '@/lib/jobs/renderInBrowser'
import { saveGeneratedDocument } from '@/app/admin/(protected)/jobs/[id]/documents/actions'
import { SubmitButtonLabel } from './SubmitButtonLabel'

/** One button for every generated document. The server prepares what the document says
 *  (`prepare`), this browser draws the PDF or Word file, and the server stores it
 *  (`saveGeneratedDocument`). See lib/jobs/documentFiles.ts for why the drawing happens
 *  here. */
export function GenerateDocumentButton({
  prepare,
  fields,
  label,
  pendingLabel = 'Generating',
  successMessage,
  className,
  ariaLabel,
}: {
  prepare: (prevState: PrepareState, formData: FormData) => Promise<PrepareState>
  /** Form fields the prepare action reads, e.g. { jobId } or { documentId }. */
  fields: Record<string, string>
  label: string
  pendingLabel?: string
  successMessage: string
  className: string
  ariaLabel?: string
}) {
  const [pending, setPending] = useState(false)

  async function generate() {
    setPending(true)
    try {
      const input = new FormData()
      for (const [name, value] of Object.entries(fields)) input.set(name, value)

      const { prepared, error } = await prepare({}, input)
      if (error || !prepared) {
        toast.error(error ?? 'Could not prepare the document.')
        return
      }

      const blob = await renderDocumentFile(prepared)
      const output = new FormData()
      output.set('file', new File([blob], `${prepared.number}.${prepared.format}`, { type: DOCUMENT_MIME[prepared.format] }))
      output.set('jobId', prepared.jobId)
      output.set('kind', prepared.kind)
      output.set('number', prepared.number)
      output.set('format', prepared.format)
      output.set('paymentId', prepared.paymentId ?? '')
      output.set('snapshot', JSON.stringify(prepared.snapshot))

      const saved = await saveGeneratedDocument(output)
      if (saved.error) toast.error(saved.error)
      else toast.success(successMessage)
    } catch {
      toast.error('Could not generate the document — please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <button type="button" onClick={generate} disabled={pending} aria-label={ariaLabel} className={className}>
      <SubmitButtonLabel pending={pending} label={label} pendingLabel={pendingLabel} />
    </button>
  )
}
