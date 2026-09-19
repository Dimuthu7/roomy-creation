import 'server-only'
import { Resend } from 'resend'

export interface DocumentEmail {
  to: string
  subject: string
  body: string
  filename: string
  pdf: Buffer
}

// Checked before attempting delivery, same rule as src/app/api/enquiry/route.ts: a
// document that was not sent must never be reported as sent.
export async function sendDocumentEmail(email: DocumentEmail): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.DOCS_FROM_EMAIL

  if (!apiKey) {
    console.error('Document email misconfigured: RESEND_API_KEY is not set')
    return { error: 'Email is not configured — set RESEND_API_KEY.' }
  }
  if (!from) {
    console.error('Document email misconfigured: DOCS_FROM_EMAIL is not set')
    return { error: 'Email is not configured — set DOCS_FROM_EMAIL.' }
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: [email.to],
    subject: email.subject,
    text: email.body,
    attachments: [{ filename: email.filename, content: email.pdf }],
  })

  if (error) {
    console.error('Document email failed', error)
    return { error: 'The email could not be sent. The PDF is still available to download.' }
  }
  return {}
}
