'use client'
import { GenerateDocumentButton } from '@/components/admin/GenerateDocumentButton'
import { prepareOrderDocument } from './actions'

export function GenerateOrderPdfButton({ jobId }: { jobId: string }) {
  return (
    <GenerateDocumentButton
      prepare={prepareOrderDocument}
      fields={{ jobId }}
      label="Generate order document"
      successMessage="Order document generated."
      className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
    />
  )
}
