import type { PreparedDocument } from './documentFiles'
import type { CompletionSnapshot, OrderSnapshot, QuotationSnapshot, ReceiptSnapshot } from './snapshot'

/** Draws a prepared document into a PDF or Word file. Browser-side by design (see
 *  documentFiles.ts); each renderer is loaded on demand so the PDF and Word libraries
 *  only download when an admin actually generates something. */
export async function renderDocumentFile(prepared: PreparedDocument): Promise<Blob> {
  return prepared.format === 'pdf' ? renderPdf(prepared) : renderDocx(prepared)
}

async function renderPdf({ kind, snapshot }: PreparedDocument): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer')
  switch (kind) {
    case 'quotation': {
      const { QuotationDocument } = await import('@/pdf/QuotationDocument')
      return pdf(<QuotationDocument snapshot={snapshot as QuotationSnapshot} />).toBlob()
    }
    case 'order': {
      const { OrderDocument } = await import('@/pdf/OrderDocument')
      return pdf(<OrderDocument snapshot={snapshot as OrderSnapshot} />).toBlob()
    }
    case 'completion': {
      const { CompletionDocument } = await import('@/pdf/CompletionDocument')
      return pdf(<CompletionDocument snapshot={snapshot as CompletionSnapshot} />).toBlob()
    }
    case 'receipt': {
      const { ReceiptDocument } = await import('@/pdf/ReceiptDocument')
      return pdf(<ReceiptDocument snapshot={snapshot as ReceiptSnapshot} />).toBlob()
    }
  }
}

async function renderDocx({ kind, snapshot }: PreparedDocument): Promise<Blob> {
  const { Packer } = await import('docx')
  switch (kind) {
    case 'quotation': {
      const { quotationDocument } = await import('@/docx/QuotationDocument')
      return Packer.toBlob(quotationDocument(snapshot as QuotationSnapshot))
    }
    case 'order': {
      const { orderDocument } = await import('@/docx/OrderDocument')
      return Packer.toBlob(orderDocument(snapshot as OrderSnapshot))
    }
    case 'completion': {
      const { completionDocument } = await import('@/docx/CompletionDocument')
      return Packer.toBlob(completionDocument(snapshot as CompletionSnapshot))
    }
    case 'receipt': {
      const { receiptDocument } = await import('@/docx/ReceiptDocument')
      return Packer.toBlob(receiptDocument(snapshot as ReceiptSnapshot))
    }
  }
}
