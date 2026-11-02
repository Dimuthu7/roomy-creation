// Shared by the server actions that prepare and save generated documents and by the
// browser code that renders them. No server-only imports: it is bundled into client
// components too.
//
// PDFs and Word files are drawn in the admin's browser, not on the server: a
// Cloudflare Worker on the free plan gets 10 ms of CPU per request, which is not
// enough to lay out a PDF. The server still decides what a document says (validation,
// numbering, the snapshot) — only the drawing moved.

export const DOCUMENT_KINDS = ['quotation', 'order', 'receipt', 'completion'] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export type DocumentFormat = 'pdf' | 'docx'

export const DOCUMENT_MIME: Record<DocumentFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

/** Generous for a one-to-four page document; also under Next's server action body limit. */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024

/** What the browser needs to render a document and hand the file back to the server. */
export interface PreparedDocument {
  jobId: string
  kind: DocumentKind
  number: string
  format: DocumentFormat
  paymentId: string | null
  snapshot: unknown
}

export interface PrepareState {
  error?: string
  prepared?: PreparedDocument
}

export function isDocumentKind(value: string): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(value)
}
