'use client'
import { GenerateDocumentButton } from '@/components/admin/GenerateDocumentButton'
import { prepareQuotationDocument } from './actions'

export function GeneratePdfButton({ jobId }: { jobId: string }) {
  return (
    <GenerateDocumentButton
      prepare={prepareQuotationDocument}
      fields={{ jobId }}
      label="Generate quotation PDF"
      successMessage="Quotation PDF generated."
      className="rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
    />
  )
}
