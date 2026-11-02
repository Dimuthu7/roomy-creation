'use client'
import { GenerateDocumentButton } from '@/components/admin/GenerateDocumentButton'
import { prepareCompletionDocument } from './actions'

export function GenerateCompletionPdfButton({ jobId }: { jobId: string }) {
  return (
    <GenerateDocumentButton
      prepare={prepareCompletionDocument}
      fields={{ jobId }}
      label="Generate completion certificate"
      successMessage="Completion certificate generated."
      className="rounded-full border border-navy bg-navy px-4 py-2 font-display text-sm text-paper transition duration-200 hover:bg-navy/80 active:scale-95 disabled:opacity-60"
    />
  )
}
